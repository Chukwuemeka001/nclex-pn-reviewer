import { useMemo, useState } from "react";
import { ClipboardCheck, ExternalLink, FileText, ShieldCheck, Stethoscope, UserCheck } from "lucide-react";
import {
  EXTERNAL_REVIEW_CRITERIA,
  FIRST_TEN_REVIEW_IDS,
  NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE,
  buildReviewerNoteTemplate,
  scoreExternalReview,
  summarizeReviewerDecision,
} from "../lib/externalReviewerRubric.js";

const scoreOptions = [0, 1, 2, 3, 4];

function scoreMeaning(score) {
  if (score === 4) return "strong";
  if (score === 3) return "usable";
  if (score === 2) return "needs fix";
  if (score === 1) return "unsafe/weak";
  return "not reviewed";
}

export default function ExternalReviewerGuide({ onAdmin }) {
  const [selectedId, setSelectedId] = useState(FIRST_TEN_REVIEW_IDS[0]);
  const [scores, setScores] = useState({
    stemRealism: 0,
    distractors: 0,
    rationaleTeaching: 0,
    pnScope: 0,
    clinicalSafety: 0,
    studentExperience: 0,
  });
  const [copied, setCopied] = useState("");
  const result = useMemo(() => scoreExternalReview(scores), [scores]);
  const template = useMemo(() => buildReviewerNoteTemplate(selectedId), [selectedId]);

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("Copy failed — select and copy manually.");
    }
  }

  return (
    <section className="page reviewer-page">
      <header className="reviewer-hero">
        <div>
          <p className="eyebrow">External Nurse Reviewer Orientation</p>
          <h1>Alexis review portal</h1>
          <p>
            This page gets a second nurse reviewer productive without needing the full build history. The job is not to be nice to the questions; the job is to protect students from fake, unsafe, unclear, or non-PN content.
          </p>
        </div>
        <div className="reviewer-hero-card">
          <UserCheck size={28} />
          <strong>Reviewer mindset</strong>
          <span>Recent NCLEX experience + nursing judgment + honest scoring.</span>
        </div>
      </header>

      <div className="reviewer-step-grid">
        <article className="reviewer-step-card">
          <span>1</span>
          <h2>Start with only 10 questions</h2>
          <p>Do not review hundreds. The first pass is a calibration set so Emeka and Alexis can compare judgment before scaling.</p>
        </article>
        <article className="reviewer-step-card">
          <span>2</span>
          <h2>Use the same rubric every time</h2>
          <p>Score each criterion 0-4. Clinical safety and PN scope are critical. If those are bad, the item cannot pass.</p>
        </article>
        <article className="reviewer-step-card">
          <span>3</span>
          <h2>Give PASS / FIX / REJECT</h2>
          <p>PASS means next review stage, not public-ready. FIX means salvageable. REJECT means rebuild or discard.</p>
        </article>
      </div>

      <div className="reviewer-layout">
        <article className="reviewer-panel">
          <div className="section-title">
            <h2><ClipboardCheck size={18} /> First 10 review set</h2>
            <button className="secondary-btn" onClick={() => copy(FIRST_TEN_REVIEW_IDS.join("\n"), "IDs copied")}>Copy IDs</button>
          </div>
          <p className="helper-text">In Admin, check “Show model-assisted rewrites only” or paste an ID into “Find draft.”</p>
          <div className="review-id-list">
            {FIRST_TEN_REVIEW_IDS.map((id) => (
              <button key={id} className={selectedId === id ? "review-id active" : "review-id"} onClick={() => setSelectedId(id)}>{id}</button>
            ))}
          </div>
          <div className="button-row">
            <button className="primary-btn" onClick={onAdmin}><ExternalLink size={18} /> Open AdminReview</button>
            <button className="secondary-btn" onClick={() => copy(template, "Template copied")}>Copy review template</button>
          </div>
          {copied && <div className="notice approved-banner">{copied}</div>}
        </article>

        <article className="reviewer-panel sticky-reviewer-panel">
          <h2><FileText size={18} /> Review note builder</h2>
          <label className="field"><span>Current question ID</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{FIRST_TEN_REVIEW_IDS.map((id) => <option key={id}>{id}</option>)}</select></label>
          <div className={`quality-summary ${result.decision === "PASS" ? "publish_ready" : result.decision === "FIX" ? "revise_before_publish" : "reject_or_rewrite"}`}>
            <strong>{result.total}/{result.max}</strong>
            <span>{result.decision}</span>
            <small>{summarizeReviewerDecision(result.decision)}</small>
            {result.blockers.map((blocker) => <small key={blocker}>Blocker: {blocker}</small>)}
          </div>
          <pre className="review-template">{template}</pre>
          <button className="primary-btn" onClick={() => copy(template, "Template copied")}>Copy template for this ID</button>
        </article>
      </div>

      <article className="reviewer-panel">
        <div className="section-title"><h2><ShieldCheck size={18} /> Scoring rubric</h2><span>0-4 each, 24 max</span></div>
        <div className="external-rubric-grid">
          {EXTERNAL_REVIEW_CRITERIA.map((criterion) => (
            <div className="external-rubric-card" key={criterion.id}>
              <div className="rubric-card-top">
                <h3>{criterion.label}</h3>
                {criterion.critical && <span className="critical-pill">critical</span>}
              </div>
              <label className="field">
                <span>Score: {scores[criterion.id]}/4 — {scoreMeaning(scores[criterion.id])}</span>
                <select value={scores[criterion.id]} onChange={(event) => setScores({ ...scores, [criterion.id]: Number(event.target.value) })}>
                  {scoreOptions.map((score) => <option key={score} value={score}>{score} — {scoreMeaning(score)}</option>)}
                </select>
              </label>
              <strong>Look for:</strong>
              <ul>{criterion.lookFor.map((item) => <li key={item}>{item}</li>)}</ul>
              <strong>Red flags:</strong>
              <ul>{criterion.redFlags.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
      </article>

      <div className="reviewer-layout">
        <article className="reviewer-panel">
          <h2><Stethoscope size={18} /> How Alexis should review each item</h2>
          <ol className="reviewer-checklist">
            <li>Read the stem first. Ask: “what decision is this testing?”</li>
            <li>Pick the answer before reading the rationale. If two answers feel defensible, mark FIX or REJECT.</li>
            <li>Check every distractor. Wrong options should be tempting, not stupid.</li>
            <li>Read the rationale as a struggling student. It should teach the cue, safest action, and why wrong answers fail.</li>
            <li>Check PN/RPN/LPN scope. No diagnosing, prescribing, independent med changes, or unsafe delegation.</li>
            <li>Leave blunt notes. “Feels fake” is valid feedback if it explains why.</li>
          </ol>
        </article>

        <article className="reviewer-panel warning-box">
          <h2>NCLEX result report case-study use</h2>
          <p>Alexis’s result report can help us understand real learner weaknesses, but it must stay private and should be converted into broad weakness categories only.</p>
          <ul>{NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}
