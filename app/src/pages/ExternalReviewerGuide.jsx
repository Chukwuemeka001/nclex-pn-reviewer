import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Database, ExternalLink, FileText, ShieldCheck, Stethoscope, UserCheck } from "lucide-react";
import reviewItems from "../data/external_review_first10.json";
import reviewerInstructionResearch from "../data/reviewer_instruction_research.json";
import sourceSafetyGuidance from "../data/source_safety_guidance.json";
import {
  EXTERNAL_REVIEW_CRITERIA,
  REVIEW_IDS as REVIEW_IDS,
  NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE,
  REVIEWER_PROFILES,
  buildExternalReviewBatch,
  buildExternalReviewSubmission,
  buildGitHubIssueUrl,
  buildReviewerNoteTemplate,
  getReviewerProfile,
  scoreExternalReview,
  summarizeReviewerDecision,
} from "../lib/externalReviewerRubric.js";

const scoreOptions = [0, 1, 2, 3, 4];
const captureRepo = import.meta.env.VITE_REVIEW_CAPTURE_REPO || "Chukwuemeka001/nclex-pn-reviewer";
const reviewSubmitEndpoint = import.meta.env.VITE_EXTERNAL_REVIEW_SUBMIT_ENDPOINT || "";

function reviewerKeyFromLocation() {
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : window.location.search.replace(/^\?/, "");
  return new URLSearchParams(query).get("reviewer") || "alexis";
}

function storageKeyFor(profile) {
  return `nclexPnExternalReviewerDrafts.v2.${profile.key}`;
}

function blankResponse(profile = REVIEWER_PROFILES.alexis) {
  return {
    reviewerKey: profile.key,
    reviewerName: profile.name,
    reviewerRole: profile.role,
    reviewerLens: profile.primaryLens,
    decision: "",
    issueType: "",
    severity: "",
    confidence: "",
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

function loadDrafts(profile) {
  try { return JSON.parse(localStorage.getItem(storageKeyFor(profile)) || "{}"); } catch { return {}; }
}

function reviewerUrl(key) {
  return `${window.location.origin}${window.location.pathname}#/reviewer?reviewer=${key}`;
}

export default function ExternalReviewerGuide() {
  const [reviewerKey, setReviewerKey] = useState(reviewerKeyFromLocation);
  const profile = getReviewerProfile(reviewerKey);
  const [selectedId, setSelectedId] = useState(REVIEW_IDS[0]);
  const [drafts, setDrafts] = useState(() => loadDrafts(profile));
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState("");
  const item = useMemo(() => reviewItems.find((entry) => entry.id === selectedId) || reviewItems[0], [selectedId]);
  const response = { ...blankResponse(profile), ...(drafts[selectedId] || {}) };
  const result = useMemo(() => scoreExternalReview(response.scores), [response.scores]);
  const decision = response.decision || result.decision;
  const template = useMemo(() => buildReviewerNoteTemplate(selectedId, { ...response, decision }), [selectedId, response, decision]);
  const completedIds = REVIEW_IDS.filter((id) => drafts[id]?.decision || drafts[id]?.notes || drafts[id]?.submitted);
  const completedCount = completedIds.length;
  const hasSubmitEndpoint = Boolean(reviewSubmitEndpoint);

  useEffect(() => {
    const onHash = () => {
      const nextProfile = getReviewerProfile(reviewerKeyFromLocation());
      setReviewerKey(nextProfile.key);
      setDrafts(loadDrafts(nextProfile));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKeyFor(profile), JSON.stringify(drafts));
  }, [drafts, profile]);

  function switchReviewer(key) {
    const nextProfile = getReviewerProfile(key);
    setReviewerKey(nextProfile.key);
    setDrafts(loadDrafts(nextProfile));
    window.history.pushState({}, "", `#/reviewer?reviewer=${nextProfile.key}`);
  }

  function updateResponse(patch) {
    setDrafts((current) => ({
      ...current,
      [selectedId]: { ...blankResponse(profile), ...(current[selectedId] || {}), ...patch },
    }));
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

  function currentPayload() {
    const submittedAt = new Date().toISOString();
    const payload = {
      ...response,
      submittedAt,
      decision,
      reviewerKey: profile.key,
      reviewerName: response.reviewerName || profile.name,
      reviewerRole: profile.role,
      reviewerLens: profile.primaryLens,
    };
    return buildExternalReviewSubmission({ item, response: payload, scoreResult: result });
  }

  async function submitPayload(payload, label) {
    if (!hasSubmitEndpoint) {
      await copy(JSON.stringify(payload, null, 2), `${label} copied — send to Emeka`);
      return { fallbackCopied: true };
    }
    const response = await fetch(reviewSubmitEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Submit failed with HTTP ${response.status}`);
    return body;
  }

  async function submitCurrent() {
    const submittedAt = new Date().toISOString();
    const submission = currentPayload();
    try {
      await submitPayload(submission, "Current review");
      updateResponse({ submitted: true, submittedAt });
      setCopied(hasSubmitEndpoint ? "Current review submitted and saved." : "Current review copied. Send it to Emeka if no backend is connected.");
    } catch (error) {
      await copy(JSON.stringify(submission, null, 2), "Submit failed; copied current review JSON");
      setCopied(`Submit failed, so JSON was copied instead: ${error.message}`);
    }
  }

  async function submitAllCompleted() {
    const batch = buildExternalReviewBatch({ items: reviewItems, drafts, reviewerProfile: profile, onlyCompleted: true });
    if (!batch.count) {
      setCopied("No completed/drafted reviews to submit yet.");
      return;
    }
    try {
      await submitPayload(batch, "All completed reviews");
      const submittedAt = new Date().toISOString();
      setDrafts((current) => {
        const next = { ...current };
        for (const submission of batch.submissions) {
          next[submission.questionId] = { ...(next[submission.questionId] || {}), submitted: true, submittedAt };
        }
        return next;
      });
      setCopied(hasSubmitEndpoint ? `${batch.count} reviews submitted and saved.` : `${batch.count} reviews copied. Send them to Emeka if no backend is connected.`);
    } catch (error) {
      await copy(JSON.stringify(batch, null, 2), "Submit failed; copied all reviews JSON");
      setCopied(`Submit failed, so JSON was copied instead: ${error.message}`);
    }
  }

  function openIssue() {
    const payload = { ...response, decision, reviewerKey: profile.key, reviewerName: response.reviewerName || profile.name, reviewerRole: profile.role, reviewerLens: profile.primaryLens };
    const url = buildGitHubIssueUrl({ repo: captureRepo, item, response: payload, scoreResult: result });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function exportAll() {
    const payload = buildExternalReviewBatch({ items: reviewItems, drafts, reviewerProfile: profile, onlyCompleted: false });
    copy(JSON.stringify(payload, null, 2), "All drafts copied as JSON");
  }

  return (
    <section className="page reviewer-page">
      <header className="reviewer-hero">
        <div>
          <p className="eyebrow">Paid external reviewer workflow</p>
          <h1>{profile.headline}</h1>
          <p>{profile.intro}</p>
          <div className="button-row">
            <button className="primary-btn" onClick={submitCurrent}><Database size={18} /> Submit current review</button>
            <button className="primary-btn" onClick={submitAllCompleted}><ClipboardCheck size={18} /> Submit all completed</button>
            <button className="secondary-btn" onClick={exportAll}>Copy/export backup</button>
          </div>
          <p className="helper-text">{hasSubmitEndpoint ? "Submits directly to the review log. No GitHub account or issue screen." : "Backend endpoint is not connected in this build, so submit buttons copy JSON as a safe fallback."}</p>
        </div>
        <div className="reviewer-hero-card">
          <UserCheck size={28} />
          <strong>{completedCount}/{REVIEW_IDS.length} started or submitted</strong>
          <span>{profile.shortLabel}. Drafts autosave only on this phone/browser.</span>
        </div>
      </header>

      <article className="reviewer-panel warning-box">
        <h2>Read this first: what we are building and the copyright problem</h2>
        <p>
          We are building a low-cost NCLEX-PN/RPN/LPN daily trainer with an error journal and remediation coach. It is not meant to be a UWorld clone. The hard problem is not just making questions; it is making safe, useful, original questions that teach weak students without copying paid qbanks, leaked exam material, or official NCLEX items.
        </p>
        <p>
          Your role is to help us find weak questions before students see them. If a question feels AI-generated, too generic, confusing, clinically unsafe, too similar to a prep-bank pattern, or not useful for a tired learner, mark it down. We would rather reject 70% now than publish garbage later.
        </p>
      </article>

      <div className="reviewer-step-grid">
        <article className="reviewer-step-card"><span>1</span><h2>Choose your reviewer space</h2><p>Use your own link so your name and role are captured correctly.</p></article>
        <article className="reviewer-step-card"><span>2</span><h2>Read before showing key</h2><p>Choose the answer first. Then show the rationale and score the item.</p></article>
        <article className="reviewer-step-card"><span>3</span><h2>Submit without GitHub</h2><p>Tap “Submit current review” or “Submit all completed.” GitHub issue export stays available only as an admin fallback.</p></article>
      </div>

      <article className="reviewer-panel">
        <div className="section-title"><h2>Reviewer links</h2><span>Send each person their exact link</span></div>
        <div className="reviewer-link-grid">
          {Object.values(REVIEWER_PROFILES).map((reviewer) => (
            <div className={profile.key === reviewer.key ? "reviewer-link-card active" : "reviewer-link-card"} key={reviewer.key}>
              <strong>{reviewer.shortLabel}</strong>
              <p>{reviewer.role}</p>
              <button className="secondary-btn" onClick={() => switchReviewer(reviewer.key)}>Open this reviewer space</button>
              <button className="secondary-btn" onClick={() => copy(reviewerUrl(reviewer.key), `${reviewer.name} link copied`)}>Copy {reviewer.name} link</button>
            </div>
          ))}
        </div>
      </article>

      <div className="reviewer-layout">
        <article className="reviewer-panel">
          <h2><Stethoscope size={18} /> Your role lens</h2>
          <ul>{profile.primaryLens.map((lens) => <li key={lens}>{lens}</li>)}</ul>
          <h3>You are not expected to</h3>
          <ul>{profile.notExpected.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="reviewer-panel">
          <h2>Confidentiality and source-safety rules</h2>
          <ul className="reviewer-checklist">
            <li>Do not copy, post, forward, or reuse unpublished questions outside this review.</li>
            <li>Do not paste questions into ChatGPT, search engines, forums, WhatsApp groups, or public tools.</li>
            <li>Flag anything that resembles UWorld, Archer, ATI, Kaplan, Saunders, Bootcamp, Quizlet dumps, Reddit/Telegram dumps, or remembered NCLEX content.</li>
            <li>Official NCLEX/NCSBN materials guide our framework only; we do not copy their questions.</li>
            <li>Open RN/CC BY and verified public-domain government material may support concepts, but still needs attribution and checking.</li>
          </ul>
        </article>
      </div>

      <div className="reviewer-layout mobile-review-layout">
        <article className="reviewer-panel">
          <div className="section-title">
            <h2><ClipboardCheck size={18} /> Review items ({REVIEW_IDS.length})</h2>
            <button className="secondary-btn" onClick={() => copy(REVIEW_IDS.join("\n"), "IDs copied")}>Copy IDs</button>
          </div>
          <div className="review-id-list compact">
            {REVIEW_IDS.map((id, index) => (
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
          <label className="field"><span>Confidence</span><select value={response.confidence} onChange={(event) => updateResponse({ confidence: event.target.value })}><option value="">Select confidence</option><option>high</option><option>medium</option><option>low / uncertain but concerning</option></select></label>
          <label className="field"><span>Issue type</span><input placeholder="stem, distractors, rationale, clinical safety, PN scope, too generated, source concern..." value={response.issueType} onChange={(event) => updateResponse({ issueType: event.target.value })} /></label>
          <label className="field"><span>Severity</span><select value={response.severity} onChange={(event) => updateResponse({ severity: event.target.value })}><option value="">Select severity</option><option>minor</option><option>important</option><option>critical</option></select></label>
          <label className="field"><span>{profile.name} notes</span><textarea value={response.notes} onChange={(event) => updateResponse({ notes: event.target.value })} placeholder="Be blunt. What feels fake, unsafe, unclear, copied, too easy, or actually useful?" /></label>
          <label className="field"><span>Suggested fix, if any</span><textarea value={response.suggestedFix} onChange={(event) => updateResponse({ suggestedFix: event.target.value })} placeholder="Only suggest a fix if it is obvious. If unsure, say what concern needs checking." /></label>
          <pre className="review-template">{template}</pre>
          <div className="button-row"><button className="primary-btn" onClick={submitCurrent}>Submit current review</button><button className="primary-btn" onClick={submitAllCompleted}>Submit all completed</button><button className="secondary-btn" onClick={() => copy(template, "Template copied")}>Copy note</button><button className="secondary-btn" onClick={openIssue}><ExternalLink size={16} /> GitHub fallback</button></div>
          {copied && <div className="notice approved-banner">{copied}</div>}
        </article>
      </div>

      <div className="reviewer-layout">
        <article className="reviewer-panel"><h2>What “good review” means</h2><ol className="reviewer-checklist"><li>Say what is wrong, why it matters, and what would fix it.</li><li>Separate major issues from minor edits.</li><li>Flag uncertainty instead of guessing.</li><li>Mark low-quality AI-sounding rationales down even if the answer key is right.</li><li>Reject anything unsafe, copied-looking, or not useful for learners.</li><li>Use “Submit current review” for one item, or “Submit all completed” when finished. GitHub is only a fallback.</li></ol></article>
        <article className="reviewer-panel warning-box"><h2>NCLEX result report privacy</h2><p>Do not upload raw failed-result emails/reports here. If Emeka leaves a report in Downloads, Hermes can privately summarize broad weakness categories later. The public review site should never receive screenshots, exact report text, or identifiers.</p><ul>{NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE.map((item) => <li key={item}>{item}</li>)}</ul></article>
      </div>

      <div className="reviewer-layout">
        <article className="reviewer-panel"><h2>Human-review systems we borrowed from</h2><ul>{reviewerInstructionResearch.map((entry) => <li key={entry.source}><strong>{entry.source}:</strong> {entry.pattern} <a href={entry.url} target="_blank" rel="noreferrer">source</a></li>)}</ul></article>
        <article className="reviewer-panel"><h2>Free-question/source-safety rule</h2><ul>{sourceSafetyGuidance.map((entry) => <li key={entry.source}><strong>{entry.category} — {entry.source}:</strong> {entry.recommendedUse}</li>)}</ul></article>
      </div>
    </section>
  );
}
