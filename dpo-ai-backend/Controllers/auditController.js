import OpenAI from 'openai';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import AuditLog from '../models/AuditLog.js';
import { anonymizeText } from '../utils/anonymizer.js';
import { DPO_AGENT_PROMPT } from '../utils/SystemPrompt.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
});

const sendSseEvent = (res, payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const getComplianceScore = (report) => {
    const scoreMatch = report.match(/(?:Compliance Score|Compliance health index):\s*\[?(\d{1,3})\]?\/100/i);
    return scoreMatch ? Math.min(100, Number(scoreMatch[1])) : 0;
};

const parseAuditMetadata = (report) => {
    const metadataMatch = report.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!metadataMatch) return null;

    try {
        const parsed = JSON.parse(metadataMatch[1]);
        const numberOrZero = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
        const remediationTasks = Array.isArray(parsed.remediationTasks)
            ? parsed.remediationTasks.filter((task) => typeof task === 'string').slice(0, 3)
            : [];
        const toolRequest = parsed.toolExecutionRequest;
        const toolExecutionRequest = toolRequest && typeof toolRequest === 'object'
            ? {
                toolRequired: toolRequest.toolRequired === true,
                toolName: typeof toolRequest.toolName === 'string' ? toolRequest.toolName : '',
                arguments: toolRequest.arguments && typeof toolRequest.arguments === 'object'
                    ? {
                        score: typeof toolRequest.arguments.score === 'string' ? toolRequest.arguments.score : '',
                        primaryViolation: typeof toolRequest.arguments.primaryViolation === 'string'
                            ? toolRequest.arguments.primaryViolation.slice(0, 2000)
                            : '',
                        severity: typeof toolRequest.arguments.severity === 'string' ? toolRequest.arguments.severity : ''
                    }
                    : null
            }
            : null;

        return {
            parsedHealthIndex: Math.min(100, numberOrZero(parsed.parsedHealthIndex)),
            article46Breaches: numberOrZero(parsed.article46Breaches),
            article54Breaches: numberOrZero(parsed.article54Breaches),
            article9Breaches: numberOrZero(parsed.article9Breaches),
            remediationTasks,
            toolExecutionRequest
        };
    } catch {
        return null;
    }
};

const getAuditScore = (report, metadata) => metadata?.parsedHealthIndex ?? getComplianceScore(report);

const triggerNCSAIncidentAlert = async (metadata, score) => {
    const request = metadata?.toolExecutionRequest;
    if (score >= 50 || request?.toolRequired !== true || request.toolName !== 'triggerNCSAIncidentAlert') {
        return { status: 'not_required' };
    }

    const alertUrl = process.env.NCSA_ALERT_URL;
    if (!alertUrl) {
        console.warn('NCSA incident alert required but NCSA_ALERT_URL is not configured.');
        return { status: 'not_configured' };
    }

    const payload = {
        score: `${score}/100`,
        primaryViolation: request.arguments?.primaryViolation || 'Critical compliance breach detected.',
        severity: 'CRITICAL'
    };
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.NCSA_ALERT_TOKEN) headers.Authorization = `Bearer ${process.env.NCSA_ALERT_TOKEN}`;

    try {
        const response = await fetch(alertUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) {
            console.error(`NCSA incident alert failed with status ${response.status}.`);
            return { status: 'failed', httpStatus: response.status };
        }
        return { status: 'sent' };
    } catch (error) {
        console.error('NCSA incident alert request failed:', error.message);
        return { status: 'failed' };
    }
};

const hasCompleteAudit = (report) => {
    const requiredSections = [
        '# DPO LEGAL & SECURITY COMPLIANCE REPORT',
        '## 1. Executive Summary',
        '## 2. Structural Vulnerability Matrix',
        '## 3. RAG-Engine Statutory Mapping',
        '## 4. Priority Remediation Roadmap',
        '## 5. Proposed Compliant Text Draft'
    ];
    const hasSummary = report.includes('## 1. Executive Summary') || report.includes('## 1. Executive Summary & Health Index');
    const hasMapping = report.includes('## 3. RAG-Engine Statutory Mapping') || report.includes('## 3. Statutory Mapping & Regulatory Fines');
    return hasSummary && hasMapping && requiredSections.slice(1).every((section) => report.includes(section)) && Boolean(parseAuditMetadata(report));
};

export const analyzeAuditText = async (req, res) => {
    const { textToAnalyze, documentText, documentType } = req.body ?? {};
    const sourceText = typeof textToAnalyze === 'string' ? textToAnalyze : documentText;

    if (typeof sourceText !== 'string' || !sourceText.trim()) {
        return res.status(400).json({ success: false, error: 'Text to analyze is required.' });
    }
    if (!openai.apiKey) {
        return res.status(500).json({ success: false, error: 'Groq API is not configured.' });
    }

    try {
        const response = await openai.chat.completions.create({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: DPO_AGENT_PROMPT },
                { role: 'user', content: `Audit this document:\n\n${anonymizeText(sourceText)}` }
            ],
            max_tokens: 6000,
            temperature: 0.1
        });
        const report = response.choices?.[0]?.message?.content || '';
        const metadata = parseAuditMetadata(report);
        const score = getAuditScore(report, metadata);
        const alert = await triggerNCSAIncidentAlert(metadata, score);

        await AuditLog.create({
            userId: req.user._id,
            documentType: documentType || 'Other',
            characterCount: sourceText.length,
            complianceScore: score,
            status: 'Completed'
        });

        return res.json({
            success: true,
            complianceHealthIndex: `Compliance health index: ${score}/100`,
            metadata,
            alert,
            report
        });
    } catch (error) {
        console.error('AI Controller Error:', error.message);
        return res.status(500).json({ success: false, error: 'The compliance audit could not be completed.' });
    }
};

export const streamAudit = async (req, res) => {
    const { documentText, documentType } = req.body ?? {};
    let sourceText = typeof documentText === 'string' ? documentText : '';
    const uploadedFile = req.files?.file;

    try {
        if (uploadedFile) {
            const extension = uploadedFile.name.toLowerCase().split('.').pop();
            if (!['pdf', 'docx'].includes(extension)) {
                return res.status(400).json({ error: 'Only PDF and DOCX files are supported.' });
            }

            const header = uploadedFile.data.subarray(0, 5).toString('ascii');
            const isPdf = extension === 'pdf' && header === '%PDF-';
            const isDocx = extension === 'docx' && uploadedFile.data[0] === 0x50 && uploadedFile.data[1] === 0x4b;
            if (!isPdf && !isDocx) {
                return res.status(400).json({ error: 'The uploaded file type could not be verified.' });
            }

            if (extension === 'pdf') {
                const parser = new PDFParse({ data: uploadedFile.data });
                const parsed = await parser.getText();
                await parser.destroy();
                sourceText = parsed.text;
            } else {
                const parsed = await mammoth.extractRawText({ buffer: uploadedFile.data });
                sourceText = parsed.value;
            }
        }
    } catch (error) {
        console.error('Document extraction error:', error.message);
        return res.status(400).json({ error: 'The uploaded document could not be read.' });
    }

    if (sourceText.trim().length === 0) {
        return res.status(400).json({ error: 'Upload a PDF or DOCX file, or enter document text.' });
    }

    if (!openai.apiKey) {
        return res.status(500).json({ error: 'Groq API is not configured.' });
    }

    const cleanedText = anonymizeText(sourceText);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullAIResponse = '';

    try {
        const stream = await openai.chat.completions.create({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: DPO_AGENT_PROMPT },
                { role: 'user', content: `Audit this document:\n\n${cleanedText}` }
            ],
            max_tokens: 6000,
            temperature: 0.1,
            stream: true,
        });

        let finishReason = null;
        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            finishReason = chunk.choices?.[0]?.finish_reason || finishReason;
            if (content) {
                fullAIResponse += content;
                sendSseEvent(res, { text: content });
            }
        }

        const metadata = parseAuditMetadata(fullAIResponse);
        const score = getAuditScore(fullAIResponse, metadata);

        if (finishReason === 'length' || !hasCompleteAudit(fullAIResponse)) {
            sendSseEvent(res, { error: 'The audit report was incomplete. Please retry the audit.' });
            return res.end();
        }

        const alert = await triggerNCSAIncidentAlert(metadata, score);

        if (req.user?._id) {
            await AuditLog.create({
                userId: req.user._id,
                documentType: documentType || 'Other',
                characterCount: sourceText.length,
                complianceScore: score,
                status: 'Completed'
            });
        }

        sendSseEvent(res, { done: true, score, metadata, alert });
        res.end();
    } catch (error) {
        console.error('AI Controller Error:', error.message);
        if (!res.writableEnded) {
            sendSseEvent(res, { error: 'The compliance audit could not be completed.' });
            res.end();
        }
    }
};
