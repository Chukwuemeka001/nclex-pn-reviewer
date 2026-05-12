import { useMemo, useState } from "react";
import { Clipboard, ShieldCheck, Wand2 } from "lucide-react";
import {
  applyModelRewrite,
  buildReviewerChecklist,
  normalizeRewriteRequest,
  summarizeRewriteBatch,
} from "../lib/rewriteWorkbench.js";

const samplePath = "qbank_pipeline/improvement_reviews/nclex_improvement_loop_10_model_assisted.json";

function safeJsonParse(value, fallback = null) {
  try {
    return value.trim() ? JSON.parse(value) : fallback;
  } catch (error) {
    return { error: error.message };
  }
}

function requestFromBatch(batch, index) {
  const requests = batch?.requests || batch?.modelAssistedRewriteRequests || [];
  return requests[index] || null;
}

export default function RewriteWorkbench() {
  const [batchText, setBatchText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modelText, setModelText] = useState("");

  const parsedBatch = useMemo(() => safeJsonParse(batchText, { requests: [] }), [batchText]);
  const hasBatchError = Boolean(parsedBatch?.error);
  const requests = parsedBatch?.requests || parsedBatch?.modelAssistedRewriteRequests || [];
  const selected = requestFromBatch(parsedBatch, selectedIndex);
  const normalized = selected ? normalizeRewriteRequest(selected) : null;
  const summary = useMemo(() => hasBatchError ? null : summarizeRewriteBatch(parsedBatch || {}), [parsedBatch, hasBatchError]);
  const modelParsed = useMemo(() => safeJsonParse(modelText, {}), [modelText]);
  const applied = selected && !modelParsed?.error ? applyModelRewrite(selected, modelParsed) : null;
  const checklist = selected ? buildReviewerChecklist(selected) : [];

  return (
    <section className="page rewrite-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Internal reviewer tool</p>
          <h1>Model-Assisted Rewrite Workbench</h1>
          <p>Paste the private model-assisted request pack. Review model output here before saving edits in Admin.</p>
        </div>
      </div>

      <div className="notice safety-banner">
        <ShieldCheck size={18} />
        This tool does not approve content. It blocks locked-field changes and keeps human clinical/source-safety review mandatory.
      </div>

      <div className="editor-card">
        <div className="section-title">
          <div>
            <h2>1. Load private request pack</h2>
            <p className="helper-text">Generate with: node qbank_pipeline/scripts/nclex_improvement_loop.mjs --limit=10 --model-assisted</p>
          </div>
          <code>{samplePath}</code>
        </div>
        <label className="field">
          <span>Request pack JSON</span>
          <textarea
            className="json-input"
            value={batchText}
            onChange={(event) => { setBatchText(event.target.value); setSelectedIndex(0); }}
            placeholder="Paste nclex_improvement_loop_10_model_assisted.json here."
          />
        </label>
        {hasBatchError && <div className="notice error-banner">Invalid JSON: {parsedBatch.error}</div>}
      </div>

      {summary && requests.length > 0 && (
        <div className="metrics-grid">
          <div className="metric"><Wand2 /><span>Rewrite requests</span><strong>{summary.totalRequests}</strong><small>{summary.provider} · {summary.model}</small></div>
          <div className="metric"><span>Top fields</span><strong>{Object.entries(summary.fieldCounts).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}</strong><small>allowed fields only</small></div>
          <div className="metric"><span>Weak criteria</span><strong>{Object.entries(summary.weakCriteriaCounts).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}</strong><small>rubric-driven</small></div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="admin-layout rewrite-layout">
          <aside className="queue-panel">
            {requests.map((request, index) => {
              const item = normalizeRewriteRequest(request);
              return (
                <button key={item.id} className={selectedIndex === index ? "queue-item active" : "queue-item"} onClick={() => setSelectedIndex(index)}>
                  <strong>{item.id}</strong>
                  <span>{item.scoreLabel}</span>
                  <small>{item.allowedRewriteFields.join(", ")}</small>
                </button>
              );
            })}
          </aside>

          <div className="review-workspace">
            <div className="editor-card">
              <div className="section-title"><h2>2. Request details</h2><span>{normalized?.scoreLabel}</span></div>
              <div className="question-meta">
                {normalized?.allowedRewriteFields.map((field) => <span key={field}>Allowed: {field}</span>)}
                {normalized?.lockedFields.map((field) => <span key={field}>Locked: {field}</span>)}
              </div>
              <p><strong>Weak criteria:</strong> {(normalized?.weakestCriteria || []).map((item) => `${item.label || item.id} (${item.score})`).join("; ") || "None"}</p>
              <label className="field"><span>Prompt to send to model</span><textarea readOnly value={normalized?.userPrompt || ""} /></label>
              <div className="button-row"><button className="secondary-btn" onClick={() => navigator.clipboard?.writeText(normalized?.userPrompt || "")}><Clipboard size={18} /> Copy prompt</button></div>
            </div>

            <div className="editor-card">
              <h2>3. Paste model JSON response</h2>
              <label className="field"><span>Model output JSON</span><textarea value={modelText} onChange={(event) => setModelText(event.target.value)} placeholder='{"rewrittenFields":{"stem":"..."},"changeSummary":["..."],"reviewerWarnings":["..."]}' /></label>
              {modelParsed?.error && <div className="notice error-banner">Invalid model JSON: {modelParsed.error}</div>}
            </div>

            {applied && (
              <div className="editor-card">
                <div className="section-title"><h2>4. Human review handoff</h2><span>{applied.reviewStatus.replaceAll("_", " ")}</span></div>
                {applied.blockedChanges.length > 0 && <div className="notice error-banner">Blocked locked/unauthorized changes: {applied.blockedChanges.join(", ")}</div>}
                <div className="rewrite-preview-grid">
                  {Object.entries(applied.proposed).map(([field, value]) => (
                    <div className="table-card" key={field}>
                      <h3>{field}</h3>
                      <pre className="trace-box">{Array.isArray(value) ? value.join("\n") : String(value || "")}</pre>
                    </div>
                  ))}
                </div>
                <h3>Reviewer checklist</h3>
                <ul>{checklist.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
