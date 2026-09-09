import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
    if (!documentText.trim() || loading) return;
    setLoading(true); setAuditResult(''); setScore(null); setMetadata(null); setError('');
    try {
      // 🚨 DYNAMIC NETWORK INJECTION: Bikura automatically isano ya Ngrok cyangwa Localhost iri gukoreshwa
      const baseUrl = window.location.origin;
      const dynamicAuditUrl = `${baseUrl}/api/audit/analyze`;

      const response = await fetch(dynamicAuditUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ textToAnalyze: documentText, documentType })
      });
      if (response.status === 401) { onSignOut(); return; }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Audit request failed with status ${response.status}`);
      }

      const report = result.report || '';
      const reportMetadata = result.metadata || parseAuditMetadata(report);

      // 🚨 VISUAL SHIELD LAYER: Drop the trailing machine-readable JSON blocks from human eyes
      const cleanReport = report.split('---')[0];

      setAuditResult(cleanReport.trim());
      setMetadata(reportMetadata);
      setScore(reportMetadata?.parsedHealthIndex ?? null);
    } catch (requestError) {
      console.error('Audit request error:', requestError); setError(requestError.message || 'The audit could not be completed.');
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
        <div className="workspace-heading"><div><p className="section-kicker">01 / Source document</p><h2>Prepare your review</h2></div><span className="privacy-note"><span aria-hidden="true">◆</span> Zero raw-text retention</span></div>
        <div className="input-layout">
          <div className="document-input"><div className="field-topline"><label htmlFor="document-type">Document type</label><span>{documentText.length.toLocaleString()} characters</span></div><select id="document-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{documentTypes.map((type) => <option key={type}>{type}</option>)}</select><label htmlFor="document-file">Upload PDF or DOCX</label><input id="document-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /><span className="file-name">{selectedFile ? selectedFile.name : 'No file selected'}</span><label className="sr-only" htmlFor="document-text">Document text</label><textarea id="document-text" value={documentText} onChange={(event) => setDocumentText(event.target.value)} placeholder="Paste a privacy policy, contract, or data handling procedure here..." spellCheck="false" /><div className="input-footer"><span>PII is filtered locally before analysis</span><button className="audit-button" onClick={handleStartAudit} disabled={loading || !documentText.trim()}>{loading ? 'Auditing document' : 'Start compliance audit'}<span aria-hidden="true">→</span></button></div></div>
          <aside className="principles-panel"><p className="section-kicker">Audit lens</p><h3>What gets examined</h3><ul><li><span>01</span> Purpose and lawful basis</li><li><span>02</span> Data subject rights</li><li><span>03</span> Storage and security limits</li><li><span>04</span> Breach response obligations</li></ul><p className="panel-footnote">Built for the Rwanda compliance context, with practical remediation in every report.</p></aside>
        </div>
      </section>
      {(loading || auditResult || error) && <section className="results reveal-three"><div className="workspace-heading results-heading"><div><p className="section-kicker">02 / Audit report</p><h2>Findings and next steps</h2></div>{loading && <span className="live-label"><span className="pulse-dot" /> Live analysis</span>}</div>{error ? <div className="error-box">{error}</div> : <><div className="result-layout"><div className="report-panel">{auditResult ? <ReactMarkdown>{auditResult}</ReactMarkdown> : <p className="waiting">The report will appear here as the model responds...</p>}</div><div className={`score-panel ${scoreTone}`}><p className="section-kicker">Compliance score</p><strong>{score === null ? '--' : score}</strong><span>/100</span><p>{score === null ? 'Calculating assessment' : score < 50 ? 'Immediate attention required' : score < 80 ? 'Improvements recommended' : 'Strong foundation'}</p></div></div>{metadata && <div className="metadata-panel"><div className="metadata-heading"><div><p className="section-kicker">Analytical signals</p><h3>Regulatory exposure</h3></div><span>Machine-readable audit summary</span></div><div className="metadata-grid"><div><strong>{metadata.article46Breaches ?? 0}</strong><span>Article 46</span></div><div><strong>{metadata.article54Breaches ?? 0}</strong><span>Article 54</span></div><div><strong>{metadata.article9Breaches ?? 0}</strong><span>Article 9</span></div></div>{Array.isArray(metadata.remediationTasks) && metadata.remediationTasks.length > 0 && <div className="remediation-list"><p className="section-kicker">Priority actions</p><ol>{metadata.remediationTasks.slice(0, 3).map((task, index) => <li key={`${index}-${task}`}>{task}</li>)}</ol></div>}</div>}</>}</section>}
        <div className="topbar-meta"><span className="status-pill"><span className="status-dot" /> {user?.companyName || 'Workspace'}</span><span className="law-label">RWANDA / LAW 058/2021</span><button className="sign-out" onClick={onSignOut}>Sign out</button></div>
    </main>
  );
}