import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { buildRemediationPlan, exportErrorJournalBackup, importErrorJournalBackup, mergeJournalEntries, summarizeErrorJournal } from "../lib/errorJournal.js";

const reasonLabels = {
  unknown_miss_reason: "Unsorted miss",
  content_gap: "Content gap",
  prioritization: "Prioritization / first action",
  misread_question: "Misread question",
  changed_answer: "Changed answer",
  anxiety: "Anxiety / rushed",
  delegation_scope: "Delegation or PN scope",
  flagged_for_review: "Flagged for review",
};

export default function ErrorJournal({ entries, setEntries, onPractice }) {
  const [backupText, setBackupText] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const summary = summarizeErrorJournal(entries);
  const plan = buildRemediationPlan(entries);

  function updateEntry(questionId, patch) {
    setEntries((current) => current.map((entry) => entry.questionId === questionId ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry));
  }

  function clearReviewed() {
    setEntries((current) => current.filter((entry) => entry.status !== "reviewed"));
  }

  function exportBackup() {
    const backup = exportErrorJournalBackup(entries);
    const text = JSON.stringify(backup, null, 2);
    setBackupText(text);
    navigator.clipboard?.writeText(text);
    setBackupMessage("Backup JSON generated and copied if clipboard permission is available.");
  }

  function importBackup() {
    const result = importErrorJournalBackup(backupText);
    if (result.entries.length > 0) setEntries((current) => mergeJournalEntries(current, result.entries));
    setBackupMessage(`Imported ${result.entries.length} item(s). ${result.issues.length ? `Issues: ${result.issues.join(" ")}` : "No issues."}`);
  }

  return (
    <section className="page journal-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Personal remediation</p>
          <h1>Error Journal</h1>
          <p>Track misses, why they happened, and what to review next. Stored locally for now.</p>
        </div>
        <div className="button-row">
          <button className="secondary-btn" onClick={clearReviewed}>Clear reviewed</button>
          <button className="secondary-btn" onClick={exportBackup}>Export backup</button>
          <button className="primary-btn" onClick={onPractice}><RotateCcw size={18} /> Practice</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric"><span>Journal items</span><strong>{summary.total}</strong><small>{summary.byStatus.needs_remediation || 0} active</small></div>
        <div className="metric"><span>Top reason</span><strong>{Object.entries(summary.byReason).sort((a, b) => b[1] - a[1])[0]?.[0]?.replaceAll("_", " ") || "none"}</strong><small>student-selected over time</small></div>
        <div className="metric"><span>Top category</span><strong>{Object.entries(summary.byClientNeeds).sort((a, b) => b[1] - a[1])[0]?.[0] || "none"}</strong><small>client needs</small></div>
      </div>

      <div className="editor-card">
        <h2>Today’s remediation plan</h2>
        {plan.length === 0 ? <p>No active remediation. Miss or flag questions to build a plan.</p> : (
          <ol className="remediation-list">
            {plan.map((item, index) => <li key={`${item.questionId}-${index}`}><strong>{item.minutes} min</strong> {item.task}</li>)}
          </ol>
        )}
      </div>

      <div className="editor-card">
        <h2>Local backup / import</h2>
        <p className="helper-text">Prototype storage is browser-local. Export this JSON before clearing browser data or switching machines.</p>
        <label className="field"><span>Backup JSON</span><textarea value={backupText} onChange={(event) => setBackupText(event.target.value)} placeholder="Export creates a backup here. Paste backup JSON here to import." /></label>
        <div className="button-row"><button className="secondary-btn" onClick={importBackup}>Import backup</button></div>
        {backupMessage && <div className="notice">{backupMessage}</div>}
      </div>

      <div className="review-list">
        {entries.map((entry) => (
          <article className="review-card journal-card" key={entry.questionId}>
            <div className="question-meta">
              <span>{entry.trigger}</span>
              <span>{entry.status.replaceAll("_", " ")}</span>
              <span>{entry.attempts} attempt(s)</span>
              <span>{entry.tags?.clientNeeds}</span>
            </div>
            <h2>{entry.stem}</h2>
            <div className="tag-grid">
              <label className="field">
                <span>Why did I miss/flag this?</span>
                <select value={entry.reason} onChange={(event) => updateEntry(entry.questionId, { reason: event.target.value })}>
                  {Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={entry.status} onChange={(event) => updateEntry(entry.questionId, { status: event.target.value })}>
                  <option value="needs_remediation">Needs remediation</option>
                  <option value="review_later">Review later</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </label>
            </div>
            <p className="rationale"><strong>Rationale:</strong> {entry.rationale}</p>
            <label className="field">
              <span>My remediation note</span>
              <textarea value={entry.remediationNote || ""} onChange={(event) => updateEntry(entry.questionId, { remediationNote: event.target.value })} placeholder="In my own words: cue noticed, safest action, why I missed it." />
            </label>
            <div className="button-row">
              <button className="secondary-btn" onClick={() => updateEntry(entry.questionId, { status: "reviewed" })}><CheckCircle2 size={18} /> Mark reviewed</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
