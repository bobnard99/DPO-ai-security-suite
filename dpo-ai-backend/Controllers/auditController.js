import OpenAI from 'openai';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import AuditLog from '../models/AuditLog.js';
import { anonymizeText } from '../utils/anonymizer.js';
import { RWANDA_DATA_PRIVACY_PROMPT } from '../utils/SystemPrompt.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
});

const sendSseEvent = (res, payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
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
                { role: "system", content: RWANDA_DATA_PRIVACY_PROMPT },
                { role: 'user', content: `Audit this document:\n\n${cleanedText}` }
            ],
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
                fullAIResponse += content;
                sendSseEvent(res, { text: content });
            }
        }

        const scoreMatch = fullAIResponse.match(/^Compliance Score:\s*(\d{1,3})\/100/im);
        const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : 0;

        if (req.user?._id) {
            await AuditLog.create({
                userId: req.user._id,
                documentType: documentType || 'Other',
                characterCount: sourceText.length,
                complianceScore: score,
                status: 'Completed'
            });
        }

        sendSseEvent(res, { done: true, score });
        res.end();
    } catch (error) {
        console.error('AI Controller Error:', error.message);
        if (!res.writableEnded) {
            sendSseEvent(res, { error: 'The compliance audit could not be completed.' });
            res.end();
        }
    }
};
