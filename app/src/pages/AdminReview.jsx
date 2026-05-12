import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckSquare, Eye, EyeOff, RefreshCw, Save, Send, X } from "lucide-react";
import { NCLEX_QUALITY_RUBRIC, emptyQualityRubric, scoreQualityRubric } from "../lib/nclexQualityRubric.js";

export const REVIEW_API_BASE = import.meta.env.VITE_REVIEW_API_BASE || "/api/review";

function emptyMeta() {
  return {
    approvedBy: "",
    reviewNotes: "",
    clinicalReviewStatus: "needs_review",
    tagReviewStatus: "needs_review",
    similarityOverride: false,
    similarityOverrideNote: "",
    contentVersion: "1.0.0",
    resolvedWarnings: [],
    qualityRubric: emptyQualityRubric(),
  };
}

function itemId(item) {
  return item?.newQuestionId || item?.id;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function riskClass(label) {
  if (label === "low_similarity_risk") return "risk low";
  if (label === "medium_similarity_risk") return "risk medium";
  if (label === "high_similarity_risk") return "risk high";
  return "risk review";
}

function label(tag) {
  return tag?.label || tag?.id || "";
}

function textPreview(value, max = 84) {
  const text = Array.isArray(value) ? value.join("; ") : String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function choiceText(item, index) {
  const choices = item?.newAnswerChoices || item?.choices || [];
  return choices[index] || "";
}

function sourceGroupLabel(item) {
  return item?.sourceGroup?.groupName || item?.sourceGroup?.inferredTopicCluster || "Unassigned group";
}

function tagSummary(tagging) {
  return [
    ...(tagging?.topicTags || []),
    ...(tagging?.skillTags || []),
    ...(tagging?.bodySystemTags || []),
  ].map(label).filter(Boolean).slice(0, 4).join(", ");
}

function TagSelect({ group, value, options, onChange }) {
  return (
    <select value={value?.id || ""} onChange={(event) => onChange(options.find((tag) => tag.id === event.target.value))}>
      {options.map((tag) => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
    </select>
  );
}

function MultiTagSelect({ values = [], options = [], onChange }) {
  return (
    <select multiple value={values.map((tag) => tag.id)} onChange={(event) => {
      const ids = new Set([...event.target.selectedOptions].map((option) => option.value));
      onChange(options.filter((tag) => ids.has(tag.id)));
    }}>
      {options.map((tag) => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
    </select>
  );
}

function TextListEditor({ values = [], onChange, placeholder }) {
  return (
    <textarea
      value={values.join("\n")}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value.split("\n").filter(Boolean))}
    />
  );
}

function QualityRubricEditor({ rubric, onChange }) {
  const score = scoreQualityRubric(rubric);
  function updateCriterion(id, patch) {
    onChange({
      ...rubric,
      [id]: { ...(rubric[id] || { score: "", note: "" }), ...patch },
    });
  }

  return (
    <div className="quality-rubric">
      <div className={`quality-summary ${score.level}`}>
        <strong>{score.totalScore}/{score.maxScore}</strong>
        <span>{score.percent}% · {score.level.replaceAll("_", " ")}</span>
        {score.blockers.length > 0 && <small>{score.blockers.slice(0, 3).join(" | ")}</small>}
      </div>
      <div className="rubric-grid">
        {NCLEX_QUALITY_RUBRIC.map((criterion) => {
          const entry = rubric[criterion.id] || { score: "", note: "" };
          return (
            <div className="rubric-row" key={criterion.id}>
              <div>
                <label htmlFor={`rubric-${criterion.id}`}><strong>{criterion.label}</strong>{criterion.critical ? <span className="critical-pill">Critical</span> : null}</label>
                <p>{criterion.prompt}</p>
              </div>
              <select
                id={`rubric-${criterion.id}`}
                value={entry.score}
                onChange={(event) => updateCriterion(criterion.id, { score: event.target.value === "" ? "" : Number(event.target.value) })}
              >
                <option value="">Score</option>
                {[0, 1, 2, 3, 4].map((value) => <option value={value} key={value}>{value} - {criterion.anchors[value]}</option>)}
              </select>
              <textarea
                value={entry.note || ""}
                onChange={(event) => updateCriterion(criterion.id, { note: event.target.value })}
                placeholder="Reviewer note: why this score is justified."
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminReview() {
  const [state, setState] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [working, setWorking] = useState(null);
  const [meta, setMeta] = useState(emptyMeta);
  const [showSource, setShowSource] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("pending");
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [fastPreviewId, setFastPreviewId] = useState("");
  const [batchMeta, setBatchMeta] = useState({
    reviewerName: "",
    batchReviewNote: "",
    clinicalReviewStatus: "needs_review",
    tagReviewStatus: "needs_review",
  });
  const [batchResult, setBatchResult] = useState(null);

  async function load() {
    setMessage("");
    const response = await fetch(`${REVIEW_API_BASE}/state`);
    const next = await response.json();
    setState(next);
    const first = next.items.find((entry) => filter === "all" || entry.status !== "approved" && entry.status !== "rejected") || next.items[0];
    if (first && !selectedId) {
      setSelectedId(itemId(first.item));
      setWorking(clone(first.item));
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(`Review API unavailable: ${error.message}. Run npm run review-api.`));
  }, []);

  const selected = useMemo(() => state?.items.find((entry) => itemId(entry.item) === selectedId), [state, selectedId]);
  const visibleItems = useMemo(() => {
    const items = state?.items || [];
    if (filter === "all") return items;
    if (filter === "high") return items.filter((entry) => entry.audit?.primaryRiskLabel === "high_similarity_risk");
    if (filter === "clinical") return items.filter((entry) => entry.audit?.riskLabels?.includes("clinical_review_required"));
    if (filter === "tag") return items.filter((entry) => entry.item.reviewStatus === "needs_tag_review");
    if (filter === "ready") return items.filter((entry) => entry.fastReview?.ready);
    return items.filter((entry) => entry.status !== "approved" && entry.status !== "rejected");
  }, [state, filter]);
  const readyItems = useMemo(() => (state?.items || []).filter((entry) => entry.fastReview?.ready), [state]);
  const fastPreview = useMemo(() => {
    const id = fastPreviewId || selectedBatchIds[0] || readyItems[0] && itemId(readyItems[0].item);
    return readyItems.find((entry) => itemId(entry.item) === id) || readyItems[0] || null;
  }, [readyItems, fastPreviewId, selectedBatchIds]);

  function selectEntry(entry) {
    setSelectedId(itemId(entry.item));
    setWorking(clone(entry.item));
    setMeta(emptyMeta());
    setShowSource(false);
  }

  function updateWorking(path, value) {
    setWorking((current) => {
      const next = clone(current);
      let target = next;
      for (const key of path.slice(0, -1)) target = target[key] ||= {};
      target[path.at(-1)] = value;
      return next;
    });
  }

  async function post(path, payload) {
    const response = await fetch(`${REVIEW_API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.issues?.join(" ") || body.error || "Request failed");
    return body;
  }

  function toggleBatchId(id) {
    setSelectedBatchIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 50));
    setFastPreviewId(id);
  }

  function selectBalanced50() {
    const buckets = new Map();
    for (const entry of readyItems) {
      const group = sourceGroupLabel(entry.item);
      if (!buckets.has(group)) buckets.set(group, []);
      buckets.get(group).push(entry);
    }
    const groups = [...buckets.keys()].sort();
    const next = [];
    let cursor = 0;
    while (next.length < 50 && groups.some((group) => buckets.get(group).length > 0)) {
      const group = groups[cursor % groups.length];
      const entry = buckets.get(group).shift();
      if (entry) next.push(itemId(entry.item));
      cursor += 1;
    }
    setSelectedBatchIds(next);
    setFastPreviewId(next[0] || "");
    setBatchResult(null);
  }

  async function batchApprove() {
    try {
      const result = await post("/batch-approve", { ids: selectedBatchIds, ...batchMeta });
      setBatchResult(result);
      setMessage(`Batch approval finished: ${result.approvedCount} approved, ${result.skippedCount} skipped. Approved count ${result.beforeCount} -> ${result.afterCount}.`);
      setSelectedBatchIds([]);
      await load();
    } catch (error) {
      setMessage(`Batch approval blocked: ${error.message}`);
    }
  }

  async function save() {
    await post("/save", { item: working, reviewerNote: meta.reviewNotes });
    setMessage("Saved working edits.");
    await load();
  }

  async function approve() {
    try {
      await post(`/items/${encodeURIComponent(itemId(working))}/approve`, { item: working, meta: { ...meta, similarityRisk: selected?.audit?.primaryRiskLabel } });
      setMessage("Approved and exported to approved_questions.");
      await load();
    } catch (error) {
      setMessage(`Approval blocked: ${error.message}`);
    }
  }

  async function reject() {
    await post(`/items/${encodeURIComponent(itemId(working))}/reject`, {
      rejectedBy: meta.approvedBy,
      rejectionReason: meta.rejectionReason || "content_review_rejected",
      reviewerNote: meta.reviewNotes,
    });
    setMessage("Rejected item saved.");
    await load();
  }

  async function rewrite() {
    await post(`/items/${encodeURIComponent(itemId(working))}/rewrite`, { reviewerNote: meta.reviewNotes });
    setMessage("Sent back for rewrite.");
  }

  if (!state) {
    return (
      <section className="page empty-state">
        <RefreshCw />
        <h1>{message ? "Review API unavailable" : "Loading review console"}</h1>
        <p>{message ? "Review API unavailable. Start it with: cd app && npm run review-api." : "Connecting to local review API..."}</p>
        {message && <code>cd app && npm run review-api</code>}
        <button className="primary-btn" onClick={load}>Retry</button>
      </section>
    );
  }
  if (!working || !selected) {
    return <section className="page empty-state"><h1>No draft questions found</h1><button className="primary-btn" onClick={load}>Reload</button></section>;
  }

  const tagIndex = state.tagIndex;
  const audit = selected.audit || {};
  const blueprint = selected.blueprint || {};
  const warnings = working.draftWarnings || working.transformationWarnings || [];
  const qualityScore = scoreQualityRubric(meta.qualityRubric);

  return (
    <section className="page admin-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Internal content review</p>
          <h1>Question Approval Console</h1>
        </div>
        <button className="secondary-btn" onClick={load}><RefreshCw size={18} /> Reload</button>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="admin-metrics">
        <div><strong>{state.summary.totalDraftQuestions}</strong><span>Total drafts</span></div>
        <div><strong>{state.summary.pendingReview}</strong><span>Pending</span></div>
        <div><strong>{state.summary.lowSimilarityRisk}</strong><span>Low risk</span></div>
        <div><strong>{state.summary.mediumSimilarityRisk}</strong><span>Medium risk</span></div>
        <div><strong>{state.summary.highSimilarityRisk}</strong><span>High risk</span></div>
        <div><strong>{state.summary.clinicalReviewRequired}</strong><span>Clinical review</span></div>
        <div><strong>{state.summary.needsTagReview}</strong><span>Needs tag review</span></div>
        <div><strong>{state.summary.readyForFastReview || 0}</strong><span>Fast review ready</span></div>
        <div><strong>{state.summary.approvedCount}</strong><span>Approved</span></div>
        <div><strong>{state.summary.rejectedCount}</strong><span>Rejected</span></div>
      </div>

      <div className="editor-card fast-review-card">
        <div className="section-title">
          <div>
            <h2>Ready for Fast Review</h2>
            <p>Low-risk drafts that pass server-side readiness checks. Batch approval still requires human review status and notes.</p>
          </div>
          <span>{readyItems.length} ready</span>
        </div>

        <div className="batch-controls">
          <label className="field"><span>Reviewer name</span><input value={batchMeta.reviewerName} onChange={(e) => setBatchMeta({ ...batchMeta, reviewerName: e.target.value })} /></label>
          <label className="field"><span>Clinical status</span><select value={batchMeta.clinicalReviewStatus} onChange={(e) => setBatchMeta({ ...batchMeta, clinicalReviewStatus: e.target.value })}><option>needs_review</option><option>reviewed_passed</option><option>reviewed_failed</option></select></label>
          <label className="field"><span>Tag status</span><select value={batchMeta.tagReviewStatus} onChange={(e) => setBatchMeta({ ...batchMeta, tagReviewStatus: e.target.value })}><option>needs_review</option><option>reviewed_passed</option><option>reviewed_failed</option></select></label>
          <label className="field wide"><span>Batch review note</span><textarea value={batchMeta.batchReviewNote} onChange={(e) => setBatchMeta({ ...batchMeta, batchReviewNote: e.target.value })} placeholder="Document the clinical and tag review basis for this batch." /></label>
        </div>

        <div className="button-row">
          <button className="secondary-btn" onClick={selectBalanced50}><CheckSquare size={18} /> Select balanced 50</button>
          <button className="secondary-btn" onClick={() => { setSelectedBatchIds([]); setFastPreviewId(""); }}>Clear selection</button>
          <button
            className="primary-btn"
            disabled={!selectedBatchIds.length || selectedBatchIds.length > 50 || batchMeta.clinicalReviewStatus !== "reviewed_passed" || batchMeta.tagReviewStatus !== "reviewed_passed" || !batchMeta.reviewerName.trim() || !batchMeta.batchReviewNote.trim()}
            onClick={batchApprove}
          >
            <Check size={18} /> Approve selected ({selectedBatchIds.length}/50)
          </button>
        </div>

        {batchResult && (
          <div className="notice approved-banner">
            Approved count {batchResult.beforeCount} to {batchResult.afterCount}. Approved this batch: {batchResult.approvedCount}. Skipped: {batchResult.skippedCount}.
            {batchResult.skipped?.length > 0 && <p>{batchResult.skipped.slice(0, 3).map((item) => `${item.id}: ${item.reasons.join(", ")}`).join(" | ")}</p>}
          </div>
        )}

        <div className="batch-review-layout">
          <div className="batch-table-wrap">
            <table className="batch-table">
              <thead>
                <tr>
                  <th><span className="sr-only">Select</span></th>
                  <th>Draft</th>
                  <th>Group</th>
                  <th>Type</th>
                  <th>Stem</th>
                  <th>Correct</th>
                  <th>Client needs</th>
                  <th>Judgment</th>
                  <th>Difficulty</th>
                  <th>Tags</th>
                  <th>Strategy</th>
                  <th>Risk</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {readyItems.map((entry) => {
                  const item = entry.item;
                  const id = itemId(item);
                  const selectedForBatch = selectedBatchIds.includes(id);
                  return (
                    <tr key={id} className={fastPreview && itemId(fastPreview.item) === id ? "active" : ""} onClick={() => setFastPreviewId(id)}>
                      <td><input type="checkbox" checked={selectedForBatch} onChange={() => toggleBatchId(id)} onClick={(event) => event.stopPropagation()} /></td>
                      <td><strong>{id}</strong></td>
                      <td>{sourceGroupLabel(item)}</td>
                      <td>{item.itemType}</td>
                      <td>{textPreview(item.newStem)}</td>
                      <td>{textPreview((item.correctAnswerIndexes || []).map((index) => choiceText(item, index)))}</td>
                      <td>{label(item.tagging?.clientNeedsCategory)}</td>
                      <td>{label(item.tagging?.clinicalJudgmentStep)}</td>
                      <td>{label(item.tagging?.difficulty)}</td>
                      <td>{tagSummary(item.tagging)}</td>
                      <td>{item.generationStrategy?.strategyLabel || "Strategy unavailable"}</td>
                      <td><span className={riskClass(entry.audit?.primaryRiskLabel)}>{entry.audit?.primaryRiskLabel}</span></td>
                      <td>{entry.fastReview?.warningFlags?.length || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="fast-preview">
            <h3>Fast Preview</h3>
            {fastPreview ? (
              <>
                <p className="preview-stem">{fastPreview.item.newStem}</p>
                <ol className="preview-choices">
                  {(fastPreview.item.newAnswerChoices || []).map((choice, index) => (
                    <li key={choice} className={fastPreview.item.correctAnswerIndexes?.includes(index) ? "correct-preview" : ""}>{choice}</li>
                  ))}
                </ol>
                <div className="stat-row"><span>Correct answer</span><strong>{textPreview((fastPreview.item.correctAnswerIndexes || []).map((index) => choiceText(fastPreview.item, index)), 120)}</strong></div>
                <p><strong>Rationale:</strong> {fastPreview.item.newRationale}</p>
                <p><strong>Why wrong:</strong> {(fastPreview.item.whyWrong || []).join(" ") || "Not provided"}</p>
                <p><strong>Tags:</strong> {tagSummary(fastPreview.item.tagging)}</p>
                <p><strong>Generation strategy:</strong> {fastPreview.item.generationStrategy?.strategyLabel || "Strategy unavailable"}</p>
                <p><strong>Audit summary:</strong> {fastPreview.audit?.primaryRiskLabel || "unscored"}; stem overlap {fastPreview.audit?.stemWordOverlapPercent ?? "n/a"}%, choice overlap {fastPreview.audit?.answerChoiceWordOverlapPercent ?? "n/a"}%.</p>
              </>
            ) : <p>No ready items available.</p>}
          </div>
        </div>
      </div>

      <div className="admin-layout">
        <aside className="queue-panel">
          <div className="queue-filters">
            {["pending", "ready", "high", "clinical", "tag", "all"].map((item) => <button key={item} className={filter === item ? "chip active" : "chip"} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
          {visibleItems.map((entry) => (
            <button key={itemId(entry.item)} className={selectedId === itemId(entry.item) ? "queue-item active" : "queue-item"} onClick={() => selectEntry(entry)}>
              <strong>{entry.item.newQuestionId}</strong>
              <span className={riskClass(entry.audit?.primaryRiskLabel)}>{entry.audit?.primaryRiskLabel || "unscored"}</span>
              <small>{entry.status}</small>
            </button>
          ))}
        </aside>

        <div className="review-workspace">
          <div className="editor-card">
            <div className="section-title"><h2>Draft Question Review</h2><span>{working.itemType}</span></div>
            <label className="field"><span>Stem</span><textarea value={working.newStem || ""} onChange={(e) => updateWorking(["newStem"], e.target.value)} /></label>
            <label className="field"><span>Answer choices</span><TextListEditor values={working.newAnswerChoices || []} onChange={(v) => updateWorking(["newAnswerChoices"], v)} /></label>
            <label className="field"><span>Correct answer indexes, comma separated</span><input value={(working.correctAnswerIndexes || []).join(",")} onChange={(e) => updateWorking(["correctAnswerIndexes"], e.target.value.split(",").map((x) => Number(x.trim())).filter((x) => Number.isInteger(x)))} /></label>
            <label className="field"><span>Rationale</span><textarea value={working.newRationale || ""} onChange={(e) => updateWorking(["newRationale"], e.target.value)} /></label>
            <label className="field"><span>Why-wrong explanations</span><TextListEditor values={working.whyWrong || []} onChange={(v) => updateWorking(["whyWrong"], v)} /></label>
          </div>

          <div className="panel-grid">
            <div className="editor-card">
              <h2>Similarity Risk Panel</h2>
              <p><span className={riskClass(audit.primaryRiskLabel)}>{audit.primaryRiskLabel}</span></p>
              <div className="stat-row"><span>Stem overlap</span><strong>{audit.stemWordOverlapPercent}%</strong></div>
              <div className="stat-row"><span>Choice overlap</span><strong>{audit.answerChoiceWordOverlapPercent}%</strong></div>
              <div className="stat-row"><span>Rationale overlap</span><strong>{audit.rationaleWordOverlapPercent}%</strong></div>
              <p>Shared elements: {(audit.sharedClinicalScenarioElements || []).join(", ") || "None"}</p>
              <label className="toggle"><input type="checkbox" checked={meta.similarityOverride} onChange={(e) => setMeta({ ...meta, similarityOverride: e.target.checked })} /> Manual similarity override</label>
              <label className="field"><span>Override note</span><textarea value={meta.similarityOverrideNote} onChange={(e) => setMeta({ ...meta, similarityOverrideNote: e.target.value })} /></label>
            </div>

            <div className="editor-card">
              <h2>Clinical Accuracy Panel</h2>
              <label className="field"><span>Clinical review status</span><select value={meta.clinicalReviewStatus} onChange={(e) => setMeta({ ...meta, clinicalReviewStatus: e.target.value })}><option>needs_review</option><option>reviewed_passed</option><option>reviewed_failed</option></select></label>
              <p>Correct principle: {blueprint.correctPrinciple}</p>
              <p>Tested concept: {blueprint.testedConcept}</p>
              <p>Difficulty: {label(working.tagging?.difficulty)}</p>
              {warnings.length > 0 && <div className="warning-box"><AlertTriangle size={18} /> {warnings.length} unresolved warning(s)</div>}
              {warnings.map((warning) => <label className="toggle" key={warning}><input type="checkbox" checked={meta.resolvedWarnings.includes(warning)} onChange={(e) => setMeta((current) => ({ ...current, resolvedWarnings: e.target.checked ? [...current.resolvedWarnings, warning] : current.resolvedWarnings.filter((item) => item !== warning) }))} /> Resolve: {warning}</label>)}
            </div>
          </div>

          <div className="editor-card">
            <div className="section-title">
              <div>
                <h2>NCLEX-Style Quality Rubric</h2>
                <p className="helper-text">Approval now requires at least 32/40, notes for every criterion, and 3+ on all critical safety criteria.</p>
              </div>
              <span>{qualityScore.totalScore}/{qualityScore.maxScore}</span>
            </div>
            <QualityRubricEditor rubric={meta.qualityRubric} onChange={(qualityRubric) => setMeta({ ...meta, qualityRubric })} />
          </div>

          <div className="editor-card">
            <h2>Tag Editor</h2>
            <label className="field"><span>Tag review status</span><select value={meta.tagReviewStatus} onChange={(e) => setMeta({ ...meta, tagReviewStatus: e.target.value })}><option>needs_review</option><option>reviewed_passed</option><option>reviewed_failed</option></select></label>
            <div className="tag-grid">
              <label className="field"><span>Client Needs category</span><TagSelect value={working.tagging?.clientNeedsCategory} options={tagIndex.clientNeedsCategory || []} onChange={(v) => updateWorking(["tagging", "clientNeedsCategory"], v)} /></label>
              <label className="field"><span>Client Needs subcategory</span><TagSelect value={working.tagging?.clientNeedsSubcategory} options={tagIndex.clientNeedsSubcategory || []} onChange={(v) => updateWorking(["tagging", "clientNeedsSubcategory"], v)} /></label>
              <label className="field"><span>Clinical Judgment step</span><TagSelect value={working.tagging?.clinicalJudgmentStep} options={tagIndex.clinicalJudgmentStep || []} onChange={(v) => updateWorking(["tagging", "clinicalJudgmentStep"], v)} /></label>
              <label className="field"><span>Question type</span><TagSelect value={working.tagging?.questionType} options={tagIndex.questionType || []} onChange={(v) => updateWorking(["tagging", "questionType"], v)} /></label>
              <label className="field"><span>Difficulty</span><TagSelect value={working.tagging?.difficulty} options={tagIndex.difficulty || []} onChange={(v) => updateWorking(["tagging", "difficulty"], v)} /></label>
              <label className="field"><span>Topic tags</span><MultiTagSelect values={working.tagging?.topicTags} options={tagIndex.topic || []} onChange={(v) => updateWorking(["tagging", "topicTags"], v)} /></label>
              <label className="field"><span>Population tags</span><MultiTagSelect values={working.tagging?.populationTags} options={tagIndex.population || []} onChange={(v) => updateWorking(["tagging", "populationTags"], v)} /></label>
              <label className="field"><span>Safety tags</span><MultiTagSelect values={working.tagging?.safetyTags} options={tagIndex.safety || []} onChange={(v) => updateWorking(["tagging", "safetyTags"], v)} /></label>
              <label className="field"><span>Skill tags</span><MultiTagSelect values={working.tagging?.skillTags} options={tagIndex.skill || []} onChange={(v) => updateWorking(["tagging", "skillTags"], v)} /></label>
              <label className="field"><span>Body system tags</span><MultiTagSelect values={working.tagging?.bodySystemTags} options={tagIndex.bodySystem || []} onChange={(v) => updateWorking(["tagging", "bodySystemTags"], v)} /></label>
            </div>
          </div>

          <div className="editor-card">
            <div className="section-title">
              <h2>Source Blueprint Summary</h2>
              <button className="secondary-btn" onClick={() => setShowSource(!showSource)}>{showSource ? <EyeOff size={16} /> : <Eye size={16} />} {showSource ? "Hide" : "Show"} source trace</button>
            </div>
            <p>{blueprint.testedConcept}</p>
            <p>Required knowledge: {(blueprint.requiredKnowledge || []).join(", ")}</p>
            {showSource && (
              <pre className="trace-box">{JSON.stringify({
                sourceQuestionId: blueprint.sourceQuestionId,
                sourceQuizTitle: blueprint.sourceQuizTitle,
                originalRationaleSummary: blueprint.originalRationaleSummary,
                sourceWarnings: blueprint.sourceWarnings,
                audit,
              }, null, 2)}</pre>
            )}
          </div>

          <div className="editor-card approval-card">
            <h2>Approval / Rejection Controls</h2>
            <div className="tag-grid">
              <label className="field"><span>Reviewer</span><input value={meta.approvedBy} onChange={(e) => setMeta({ ...meta, approvedBy: e.target.value })} /></label>
              <label className="field"><span>Content version</span><input value={meta.contentVersion} onChange={(e) => setMeta({ ...meta, contentVersion: e.target.value })} /></label>
            </div>
            <label className="field"><span>Reviewer note</span><textarea value={meta.reviewNotes} onChange={(e) => setMeta({ ...meta, reviewNotes: e.target.value })} /></label>
            <label className="field"><span>Rejection reason</span><input value={meta.rejectionReason || ""} onChange={(e) => setMeta({ ...meta, rejectionReason: e.target.value })} /></label>
            <div className="button-row">
              <button className="secondary-btn" onClick={save}><Save size={18} /> Save edits</button>
              <button className="secondary-btn" onClick={rewrite}><Send size={18} /> Send back</button>
              <button className="danger-btn" onClick={reject}><X size={18} /> Reject</button>
              <button className="primary-btn" disabled={qualityScore.blockers.length > 0} onClick={approve}><Check size={18} /> Approve</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
