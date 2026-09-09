import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AUDIT_URL = `${API_URL}/api/v1/audit/audit-stream`;
const documentTypes = ['Privacy Policy', 'Terms of Service', 'Employment Contract', 'Vendor Agreement', 'Other'];

const parseAuditMetadata = (report) => {
  const metadataBlocks = [...report.matchAll(/```json\s*([\s\S]*?)\s*```/gi)];
  for (const metadataBlock of metadataBlocks.reverse()) {
    try {
      const parsed = JSON.parse(metadataBlock[1].trim());
      if (parsed?.parsedHealthIndex !== undefined) return parsed;
    } catch {
      // Continue to the next JSON block emitted by the model.
    }
  }
  return null;
};

export default function AuditDashboard({ user, token, onSignOut }) {
  const [documentText, setDocumentText] = useState('');
  const [documentType, setDocumentType] = useState('Privacy Policy');
  const [auditResult, setAuditResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleStartAudit = async () => {
    if ((!documentText.trim() && !selectedFile) || loading) return;
    setLoading(true); setAuditResult(''); setScore(null); setMetadata(null); setError('');
    try {
      const formData = new FormData();
      formData.append('documentType', documentType);
      if (selectedFile) formData.append('file', selectedFile);
      if (documentText.trim()) formData.append('documentText', documentText);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(AUDIT_URL, { method: 'POST', headers, credentials: 'include', body: formData });
      if (response.status === 401) { onSignOut(); return; }
      if (!response.ok || !response.body) throw new Error(`Audit request failed with status ${response.status}`);
      const reader = response.body.getReader(); const decoder = new TextDecoder();
      let buffer = ''; let fullText = ''; let finished = false; let receivedMetadata = null;
      const processEvent = (event) => {
        const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
        if (!data || data === '[DONE]') return;
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) { fullText += parsed.text; setAuditResult((current) => current + parsed.text); }
        if (Number.isInteger(parsed.score)) setScore(parsed.score);
        if (parsed.metadata) { receivedMetadata = parsed.metadata; setMetadata(parsed.metadata); }
        if (parsed.report) { fullText = parsed.report; setAuditResult(parsed.report); }
        if (parsed.done) finished = true;
      };
      while (!finished) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = buffer.split('\n\n'); buffer = events.pop() || '';
        for (const event of events) processEvent(event);
        if (done) {
          finished = true;
          break;
        }
      }
      if (buffer.trim()) processEvent(buffer);
      if (!receivedMetadata) {
        const parsedMetadata = parseAuditMetadata(fullText);
        if (parsedMetadata) setMetadata(parsedMetadata);
      }
      const scoreMatch = fullText.match(/(?:Compliance Score|Compliance health index):\s*\[?(\d{1,3})\]?\/100/i);
      if (score === null && scoreMatch) setScore(Math.min(100, Number(scoreMatch[1])));
    } catch (requestError) {
      console.error('Audit stream error:', requestError); setError(requestError.message || 'The audit could not be completed.');
    } finally { setLoading(false); }
  };

  const scoreTone = score === null ? 'neutral' : score < 50 ? 'critical' : score < 80 ? 'watch' : 'healthy';

  return (
    <main className="audit-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DPO AI Suite home"><span className="brand-mark" aria-hidden="true">+</span><span>DPO AI <em>Suite</em></span></a>
        <div className="topbar-meta"><span className="status-pill"><span className="status-dot" /> {user?.companyName || 'Workspace'}</span><span className="law-label">{user?.name || user?.email || 'AUTHORIZED USER'}</span><button className="sign-out" onClick={onSignOut}>Sign Out</button></div>
      </header>
      <section className="intro reveal-one"><p className="eyebrow">Privacy intelligence for teams</p><h1>Know where your policy<br /><span>stands.</span></h1><p className="intro-copy">Run a focused compliance review against Rwanda&apos;s Data Protection Law. Your document is anonymized before it reaches the audit model.</p></section>
      <section className="workspace reveal-two">
        <div className="workspace-heading"><div><p className="section-kicker">01 / Source document</p><h2>Prepare your review</h2></div><span className="privacy-note"><span aria-hidden="true">&#9670;</span> Zero raw-text retention</span></div>
        <div className="input-layout">
          <div className="document-input"><div className="field-topline"><label htmlFor="document-type">Document type</label><span>{documentText.length.toLocaleString()} characters</span></div><select id="document-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{documentTypes.map((type) => <option key={type}>{type}</option>)}</select><label htmlFor="document-file">Upload PDF or DOCX</label><input id="document-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /><span className="file-name">{selectedFile ? selectedFile.name : 'No file selected'}</span><label className="sr-only" htmlFor="document-text">Document text</label><textarea id="document-text" value={documentText} onChange={(event) => setDocumentText(event.target.value)} placeholder="Paste a privacy policy, contract, or data handling procedure here..." spellCheck="false" /><div className="input-footer"><span>PII is filtered locally before analysis</span><button className="audit-button" onClick={handleStartAudit} disabled={loading || (!documentText.trim() && !selectedFile)}>{loading ? 'Auditing document' : 'Start compliance audit'}<span aria-hidden="true">&#8594;</span></button></div></div>
          <aside className="principles-panel"><p className="section-kicker">Audit lens</p><h3>What gets examined</h3><ul><li><span>01</span> Purpose and lawful basis</li><li><span>02</span> Data subject rights</li><li><span>03</span> Storage and security limits</li><li><span>04</span> Breach response obligations</li></ul><p className="panel-footnote">Built for the Rwanda compliance context, with practical remediation in every report.</p></aside>
        </div>
      </section>
      {(loading || auditResult || error) && <section className="results reveal-three"><div className="workspace-heading results-heading"><div><p className="section-kicker">02 / Audit report</p><h2>Findings and next steps</h2></div>{loading && <span className="live-label"><span className="pulse-dot" /> Live analysis</span>}</div>{error ? <div className="error-box">{error}</div> : <><div className="result-layout"><div className="report-panel">{auditResult ? <ReactMarkdown>{auditResult}</ReactMarkdown> : <p className="waiting">The report will appear here as the model responds...</p>}</div><div className={`score-panel ${scoreTone}`}><p className="section-kicker">Compliance score</p><strong>{score === null ? '--' : score}</strong><span>/100</span><p>{score === null ? 'Calculating assessment' : score < 50 ? 'Immediate attention required' : score < 80 ? 'Improvements recommended' : 'Strong foundation'}</p></div></div>{metadata && <div className="metadata-panel"><div className="metadata-heading"><div><p className="section-kicker">Analytical signals</p><h3>Regulatory exposure</h3></div><span>Machine-readable audit summary</span></div><div className="metadata-grid"><div><strong>{metadata.article46Breaches ?? 0}</strong><span>Article 46</span></div><div><strong>{metadata.article54Breaches ?? 0}</strong><span>Article 54</span></div><div><strong>{metadata.article9Breaches ?? 0}</strong><span>Article 9</span></div></div>{Array.isArray(metadata.remediationTasks) && metadata.remediationTasks.length > 0 && <div className="remediation-list"><p className="section-kicker">Priority actions</p><ol>{metadata.remediationTasks.slice(0, 3).map((task, index) => <li key={`${index}-${task}`}>{task}</li>)}</ol></div>}</div>}</>}</section>}
        <div className="topbar-meta"><span className="status-pill"><span className="status-dot" /> {user?.companyName || 'Workspace'}</span><span className="law-label">RWANDA / LAW 058/2021</span><button className="sign-out" onClick={onSignOut}>Sign out</button></div>
    </main>
  );
}
