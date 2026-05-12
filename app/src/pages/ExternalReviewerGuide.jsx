import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, ExternalLink, FileText, ShieldCheck, Stethoscope, UserCheck } from "lucide-react";
import reviewItems from "../data/external_review_first10.json";
import {
  EXTERNAL_REVIEW_CRITERIA,
  FIRST_TEN_REVIEW_IDS,
  NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE,
  buildGitHubIssueUrl,
  buildReviewerNoteTemplate,
  scoreExternalReview,
  summarizeReviewerDecision,
} from "../lib/externalReviewerRubric.js";

const scoreOptions = [0, 1, 2, 3, 4];
const storageKey = "nclexPnExternalReviewerDrafts.v1";
const captureRepo = import.meta.env.VITE_REVIEW_CAPTURE_REPO || "Chukwuemeka001/nclex-pn-reviewer";

function blankResponse() {
  return {
    reviewerName: "Alexis",
    decision: "",
    issueType: "",
    severity: "",
    notes: "",
    suggestedFix: "",
    scores: {
      stemRealism: 0,
      distractors: 0,
      rationaleTeaching: 0,
      pnScope: 0,
      clinicalSafety: 0,
      studentExperience: 0,
    },
  };
}

function scoreMeaning(score) {
  if (score === 4) return "strong";
  if (score === 3) return "usable";
  if (score === 2) return "needs fix";
  if (score === 1) return "unsafe/weak";
  return "not reviewed";
}

function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
}

export default function ExternalReviewerGuide({ onAdmin }) {
  const [selectedId, setSelectedId] = useState(FIRST_TEN_REVIEW_IDS[0]);
  const [drafts, setDrafts] = useState(loadDrafts);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState("");
  const item = useMemo(() => reviewItems.find((entry) => entry.id === selectedId) || reviewItems[0], [selectedId]);
  const response = drafts[selectedId] || blankResponse();
  const result = useMemo(() => scoreExternalReview(response.scores), [response.scores]);
  const decision = response.decision || result.decision;
  const template = useMemo(() => buildReviewerNoteTemplate(selectedId, { ...response, decision }), [selectedId, response, decision]);
  const completedCount = FIRST_TEN_REVIEW_IDS.filter((id) => drafts[id]?.submitted || drafts[id]?.decision).length;

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts]);

  function updateResponse(patch) {
    setDrafts((current) => ({ ...current, [selectedId]: { ...blankResponse(), ...(current[selectedId] || {}), ...patch } }));
  }

  function updateScore(id, value) {
    updateResponse({ scores: { ...response.scores, [id]: Number(value) } });
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("Copy failed — select and copy manually.");
    }
  }

  function openIssue() {
    const url = buildGitHubIssueUrl({ repo: captureRepo, item, response: { ...response, decision }, scoreResult: result });
    updateResponse({ submitted: true, submittedAt: new Date().toISOString() });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function exportAll() {
    const payload = {
      exportedAt: new Date().toISOString(),
      reviewer: "Alexis",
      drafts,
      note: "Fallback export from phone localStorage. GitHub Issues are the source of truth when submitted.",
    };
    copy(JSON.stringify(payload, null, 2), "All drafts copied as JSON");
  }

  return (
    <section className="page reviewer-page">
      <header className="reviewer-hero">
        <div>
          <p className="eyebrow">Paid nurse reviewer workflow</p>
          <h1>Alexis NCLEX-PN review portal</h1>
          <p>
            Work like this is paid by the hour: slow down, score honestly, and leave notes that let us fix the product. Your job is to protect students from fake, unsafe, unclear, or non-PN content.
          </p>
          <div className="button-row">
            <button className="primary-btn" onClick={openIssue}><ExternalLink size={18} /> Submit current review to GitHub</button>
            <button className="secondary-btn" onClick={exportAll}>Copy all saved drafts</button>
          </div>
        </div>
        <div className="reviewer-hero-card">
          <UserCheck size={28} />
          <strong>{completedCount}/10 started or submitted</strong>
          <span>Drafts autosave on this phone. Submission opens a prefilled GitHub Issue.</span>
        </div>
      </header>

      <div className="reviewer-step-grid">
        <article className="reviewer-step-card"><span>1</span><h2>Read question first</h2><p>Choose the answer before opening the key/rationale. If two answers feel defensible, flag it.</p></article>
        <article className="reviewer-step-card"><span>2</span><h2>Score the rubric</h2><p>Use 0-4. Clinical safety and PN scope are critical. Polished unsafe content still fails.</p></article>
        <article className="reviewer-step-card"><span>3</span><h2>Submit one issue per question</h2><p>Tap Submit, review the prefilled GitHub Issue, then tap “Submit new issue.”</p></article>
      </div>

      <div className="reviewer-layout mobile-review-layout">
        <article className="reviewer-panel">
          <div className="section-title">
            <h2><ClipboardCheck size={18} /> First 10 calibration items</h2>
            <button className="secondary-btn" onClick={() => copy(FIRST_TEN_REVIEW_IDS.join("\n"), "IDs copied")}>Copy IDs</button>
          </div>
          <div className="review-id-list compact">
            {FIRST_TEN_REVIEW_IDS.map((id, index) => (
              <button key={id} className={selectedId === id ? "review-id active" : "review-id"} onClick={() => { setSelectedId(id); setShowKey(false); }}>
                <strong>{index + 1}.</strong> {id}{drafts[id]?.submitted ? " ✓" : drafts[id]?.decision ? " • drafted" : ""}
              </button>
            ))}
          </div>
        </article>

        <article className="reviewer-panel question-review-card">
          <p className="eyebrow">Calibration review only — not student-facing</p>
          <h2>{item.id}</h2>
          <div className="question-meta">
            {Object.values(item.tags || {}).filter(Boolean).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <p className="preview-stem">{item.stem}</p>
          <ol className="preview-choices">
            {(item.answerChoices || []).map((choice, index) => (
              <li key={choice} className={showKey && (item.correctAnswerIndexes || []).includes(index) ? "correct-preview" : ""}>{choice}</li>
            ))}
          </ol>
          <button className="secondary-btn" onClick={() => setShowKey(!showKey)}>{showKey ? "Hide answer/rationale" : "Show answer/rationale after choosing"}</button>
          {showKey && <div className="answer-key-panel"><strong>Correct answer:</strong><p>{item.correctAnswerText}</p><strong>Rationale:</strong><p>{item.rationale}</p><strong>Why wrong:</strong><ul>{(item.whyWrong || []).map((why, index) => why ? <li key={index}>{String.fromCharCode(65 + index)}. {why}</li> : null)}</ul></div>}
        </article>
      </div>

      <div className="reviewer-layout">
        <article className="reviewer-panel">
          <div className="section-title"><h2><ShieldCheck size={18} /> Score and notes</h2><span>{result.total}/{result.max} — {decision}</span></div>
          <label className="field"><span>Reviewer name</span><input value={response.reviewerName} onChange={(event) => updateResponse({ reviewerName: event.target.value })} /></label>
          <div className="external-rubric-grid single-column">
            {EXTERNAL_REVIEW_CRITERIA.map((criterion) => (
              <div className="external-rubric-card" key={criterion.id}>
                <div className="rubric-card-top"><h3>{criterion.label}</h3>{criterion.critical && <span className="critical-pill">critical</span>}</div>
                <label className="field"><span>Score: {response.scores[criterion.id]}/4 — {scoreMeaning(response.scores[criterion.id])}</span><select value={response.scores[criterion.id]} onChange={(event) => updateScore(criterion.id, event.target.value)}>{scoreOptions.map((score) => <option key={score} value={score}>{score} — {scoreMeaning(score)}</option>)}</select></label>
                <details><summary>What to look for / red flags</summary><strong>Look for:</strong><ul>{criterion.lookFor.map((text) => <li key={text}>{text}</li>)}</ul><strong>Red flags:</strong><ul>{criterion.redFlags.map((text) => <li key={text}>{text}</li>)}</ul></details>
              </div>
            ))}
          </div>
        </article>

        <article className="reviewer-panel sticky-reviewer-panel">
          <h2><FileText size={18} /> Submit response</h2>
          <div className={`quality-summary ${decision === "PASS" ? "publish_ready" : decision === "FIX" ? "revise_before_publish" : "reject_or_rewrite"}`}><strong>{result.total}/{result.max}</strong><span>{decision}</span><small>{summarizeReviewerDecision(decision)}</small>{result.blockers.map((blocker) => <small key={blocker}>Blocker: {blocker}</small>)}</div>
          <label className="field"><span>Decision</span><select value={response.decision} onChange={(event) => updateResponse({ decision: event.target.value })}><option value="">Use computed: {result.decision}</option><option>PASS</option><option>FIX</option><option>REJECT</option></select></label>
          <label className="field"><span>Issue type</span><input placeholder="stem, distractors, rationale, clinical safety, PN scope..." value={response.issueType} onChange={(event) => updateResponse({ issueType: event.target.value })} /></label>
          <label className="field"><span>Severity</span><select value={response.severity} onChange={(event) => updateResponse({ severity: event.target.value })}><option value="">Select severity</option><option>minor</option><option>important</option><option>critical</option></select></label>
          <label className="field"><span>Alexis notes</span><textarea value={response.notes} onChange={(event) => updateResponse({ notes: event.target.value })} placeholder="Be blunt. What feels fake, unsafe, unclear, or useful?" /></label>
          <label className="field"><span>Suggested fix, if any</span><textarea value={response.suggestedFix} onChange={(event) => updateResponse({ suggestedFix: event.target.value })} placeholder="Only suggest a fix if it is obvious." /></label>
          <pre className="review-template">{template}</pre>
          <div className="button-row"><button className="primary-btn" onClick={openIssue}>Submit to GitHub Issues</button><button className="secondary-btn" onClick={() => copy(template, "Template copied")}>Copy note</button></div>
          {copied && <div className="notice approved-banner">{copied}</div>}
        </article>
      </div>

      <div className="reviewer-layout">
        <article className="reviewer-panel"><h2><Stethoscope size={18} /> How to work</h2><ol className="reviewer-checklist"><li>Assume your time matters. Review carefully, not fast.</li><li>Pick an answer before showing the key.</li><li>If a distractor is too stupid, mark it down.</li><li>If the rationale does not teach a weak student, mark it down.</li><li>If safety or PN scope is wrong, reject it.</li><li>Submit one GitHub Issue per question.</li></ol></article>
        <article className="reviewer-panel warning-box"><h2>NCLEX result report privacy</h2><p>Do not upload the raw failed-result email/report here. If Emeka leaves it in Downloads, Hermes can privately summarize broad weakness categories later. The public review site should never receive screenshots, exact report text, or identifiers.</p><ul>{NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE.map((item) => <li key={item}>{item}</li>)}</ul></article>
      </div>
    </section>
  );
}
