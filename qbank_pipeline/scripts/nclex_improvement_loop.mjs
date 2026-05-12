import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyQualityRubric, scoreQualityRubric } from "../../app/src/lib/nclexQualityRubric.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const pipelineRoot = path.join(repoRoot, "qbank_pipeline");
const defaultOutputDir = path.join(pipelineRoot, "improvement_reviews");

const PRIVATE_KEY_RE = /^(source|audit|similarity|blueprint)|source|audit|trace|url|slug|raw/i;
const UNSAFE_TEXT_RE = /(https?:\/\/|www\.|rise\s*360|alphaslice|source_raw|sourceQuestionId|sourceUrl|masterSource)/i;

function text(value) {
  return Array.isArray(value) ? value.join(" ") : String(value || "");
}

function words(value) {
  return text(value).trim().split(/\s+/).filter(Boolean);
}

function itemId(item) {
  return item.id || item.newQuestionId || item.questionId || "";
}

function choicesFromItem(item) {
  return item.choices || item.newAnswerChoices || [];
}

function stemFromItem(item) {
  return item.stem || item.newStem || "";
}

function rationaleFromItem(item) {
  return item.rationale || item.newRationale || "";
}

function normalizeCandidate(item, extras = {}) {
  const choices = choicesFromItem(item);
  return {
    id: itemId(item),
    status: item.status || item.reviewStatus || extras.status || "generated_review_candidate",
    itemType: item.itemType || item.tagging?.questionType?.id || "multiple_choice",
    stem: stemFromItem(item),
    choices,
    correctAnswerIndexes: item.correctAnswerIndexes || [],
    correctAnswerText: item.correctAnswerText || (item.correctAnswerIndexes || []).map((index) => choices[index]).filter(Boolean),
    rationale: rationaleFromItem(item),
    whyWrong: item.whyWrong || [],
    tagging: item.tagging || {},
    difficulty: item.difficulty || item.tagging?.difficulty?.id || "medium",
    estimatedTimeSeconds: item.estimatedTimeSeconds || item.tagging?.estimatedTimeSeconds || 60,
    audit: extras.audit || item.audit || null,
    review: item.review || null,
  };
}

function scoreEntry(score, note) {
  return { score, note };
}

function validCorrectIndexes(candidate) {
  return Array.isArray(candidate.correctAnswerIndexes)
    && candidate.correctAnswerIndexes.length > 0
    && candidate.correctAnswerIndexes.every((index) => Number.isInteger(index) && index >= 0 && index < candidate.choices.length);
}

function hasDecisionLanguage(stem) {
  return /first|priority|best|most appropriate|initial|next|should|action|intervention|teach|report|delegate|assign|assess|monitor|notify|safety/i.test(stem);
}

function hasNursingContext(stem) {
  return /nurse|practical nurse|client|patient|resident|care|provider|medication|symptom|vital|assessment/i.test(stem);
}

function tagCount(tagging = {}) {
  return [
    ...(tagging.topicTags || []),
    ...(tagging.skillTags || []),
    ...(tagging.bodySystemTags || []),
    ...(tagging.populationTags || []),
    ...(tagging.safetyTags || []),
  ].filter(Boolean).length;
}

function rubricFromHeuristics(candidate) {
  const rubric = emptyQualityRubric();
  const stem = candidate.stem || "";
  const rationale = candidate.rationale || "";
  const whyWrong = candidate.whyWrong || [];
  const audit = candidate.audit || {};
  const choiceTexts = candidate.choices || [];
  const stemWordCount = words(stem).length;
  const rationaleWordCount = words(rationale).length;
  const risk = audit.primaryRiskLabel || candidate.review?.qualityScore?.level || "unscored";
  const lowRisk = risk === "low_similarity_risk" || candidate.status === "reviewed_approved";
  const hasTags = candidate.tagging && candidate.tagging.clientNeedsCategory?.id && candidate.tagging.clinicalJudgmentStep?.id && candidate.tagging.questionType?.id;
  const enoughTags = hasTags && tagCount(candidate.tagging) >= 2;
  const choicesValid = Array.isArray(choiceTexts) && choiceTexts.length >= 4 && choiceTexts.every((choice) => words(choice).length >= 2);
  const genericDistractors = choiceTexts.filter((choice) => /\b(disease|food|color|number|thing|option|answer)\b/i.test(choice)).length;
  const clinicallyShapedChoices = choicesValid && genericDistractors === 0;
  const correctValid = validCorrectIndexes(candidate);
  const itemType = candidate.itemType || candidate.tagging?.questionType?.id || "multiple_choice";
  const typeMatches = itemType.includes("select") || itemType.includes("multiple_response") || candidate.correctAnswerIndexes.length === 1;

  rubric.clinicalAccuracy = scoreEntry(
    audit.clinicallySafe === false ? 2 : 3,
    audit.clinicallySafe === false
      ? "Automated loop cannot clear clinical safety; nurse/educator review required."
      : "No automated clinical-safety blocker found, but human clinical review is still required."
  );
  rubric.nclexDecisionFocus = scoreEntry(
    hasDecisionLanguage(stem) && hasNursingContext(stem) ? 4 : hasDecisionLanguage(stem) ? 3 : 2,
    hasDecisionLanguage(stem)
      ? "Stem contains decision/action language rather than only recall language."
      : "Stem does not strongly force a nursing decision; rewrite toward priority, safety, teaching, or next action."
  );
  rubric.stemClarity = scoreEntry(
    stemWordCount >= 18 && stemWordCount <= 75 && hasNursingContext(stem) ? 4 : stemWordCount >= 10 ? 3 : 2,
    stemWordCount >= 18 && stemWordCount <= 75
      ? "Stem length is within a realistic concise clinical-scenario range."
      : "Stem is too short, too long, or missing enough clinical context."
  );
  rubric.answerKeyQuality = scoreEntry(
    correctValid && typeMatches ? 4 : correctValid ? 3 : 1,
    correctValid && typeMatches
      ? "Correct-answer indexes are valid and item type appears consistent."
      : "Correct answer/key or item type needs review before approval."
  );
  rubric.distractorPlausibility = scoreEntry(
    clinicallyShapedChoices && new Set(choiceTexts.map((choice) => choice.toLowerCase().trim())).size === choiceTexts.length ? 3 : 2,
    clinicallyShapedChoices
      ? "Distractors are structurally plausible, but human review must confirm clinical plausibility."
      : "Distractors are too short, too few, duplicated, generic, or structurally weak."
  );
  rubric.rationaleQuality = scoreEntry(
    rationaleWordCount >= 25 && whyWrong.length >= Math.max(2, choiceTexts.length - candidate.correctAnswerIndexes.length - 1) ? 4
      : rationaleWordCount >= 20 ? 3 : 2,
    rationaleWordCount >= 25 && whyWrong.length > 0
      ? "Rationale and why-wrong explanations are present enough to teach."
      : "Rationale needs stronger teaching logic and why-wrong explanations."
  );
  rubric.cognitiveLevel = scoreEntry(
    /priority|first|next|best|most appropriate|assessment|intervention|teaching|respond/i.test(stem) ? 4 : 2,
    /priority|first|next|best|most appropriate/i.test(stem)
      ? "Question appears to test application/priority judgment."
      : "Question may still be recall-heavy; rewrite to require cue interpretation or prioritization."
  );
  rubric.pnScope = scoreEntry(
    /diagnose|prescribe|independently adjust/i.test(`${stem} ${choiceTexts.join(" ")}`) ? 2 : 3,
    "Automated PN-scope screen found no obvious provider-only action, but human PN-scope review is required."
  );
  rubric.taggingMetadata = scoreEntry(
    enoughTags ? 4 : hasTags ? 3 : 2,
    enoughTags ? "Core NCLEX metadata and multiple topic/skill/body-system tags are present." : "Tagging is incomplete for analytics and weak-area drills."
  );
  rubric.originalitySafety = scoreEntry(
    candidate.status === "reviewed_approved" ? 4 : lowRisk ? 3 : 2,
    candidate.status === "reviewed_approved"
      ? "Candidate came from approved set; sanitizer still required before public export."
      : lowRisk
        ? "Similarity audit is low risk, but generated candidate still needs originality review."
        : "Similarity/source-safety risk is not low; rewrite and review required."
  );

  return rubric;
}

export function scoreQuestionCandidate(candidate) {
  const rubric = rubricFromHeuristics(candidate);
  const qualityScore = scoreQualityRubric(rubric);
  const weakestCriteria = qualityScore.rows
    .filter((row) => row.score == null || row.score < 3 || qualityScore.blockers.some((blocker) => blocker.startsWith(row.label)))
    .map((row) => ({ id: row.id, label: row.label, score: row.score, critical: row.critical, note: row.note }));
  return { ...candidate, rubric, qualityScore, weakestCriteria };
}

function rewriteFieldsForCriteria(criteria) {
  const fields = new Set();
  for (const criterion of criteria) {
    if (["nclexDecisionFocus", "stemClarity", "cognitiveLevel"].includes(criterion.id)) fields.add("stem");
    if (["distractorPlausibility", "answerKeyQuality"].includes(criterion.id)) fields.add("distractors");
    if (["rationaleQuality"].includes(criterion.id)) fields.add("rationale");
    if (["taggingMetadata"].includes(criterion.id)) fields.add("metadata");
    if (["clinicalAccuracy", "pnScope"].includes(criterion.id)) fields.add("clinical_review");
    if (["originalitySafety"].includes(criterion.id)) fields.add("source_safety_review");
  }
  return [...fields];
}

export function buildRewritePlan(scored) {
  const weak = scored.weakestCriteria.length ? scored.weakestCriteria : scored.qualityScore.rows.filter((row) => row.score < 4).sort((a, b) => a.score - b.score).slice(0, 3);
  const rewriteFields = rewriteFieldsForCriteria(weak);
  const instructions = [];
  if (rewriteFields.includes("stem")) instructions.push("Rewrite the stem into a realistic PN clinical scenario that forces one clinical decision: priority, first action, teaching, safety, delegation, assessment, or escalation.");
  if (rewriteFields.includes("distractors")) instructions.push("Rewrite distractors so each wrong option is clinically plausible but clearly less safe, lower priority, or incomplete compared with the key.");
  if (rewriteFields.includes("rationale")) instructions.push("Rewrite rationale to teach the nursing principle, priority logic, and why each distractor is wrong.");
  if (rewriteFields.includes("metadata")) instructions.push("Fix NCLEX metadata: client needs, clinical judgment step, question type, difficulty, topic, skill, body system, and safety tags.");
  if (rewriteFields.includes("clinical_review")) instructions.push("Do not publish until a human nurse/educator verifies clinical accuracy and PN scope.");
  if (rewriteFields.includes("source_safety_review")) instructions.push("Rewrite away from source scenario structure and rerun sanitizer/similarity review before approval.");

  return {
    rewriteFields,
    weakestCriteria: weak.map(({ id, label, score, critical, note }) => ({ id, label, score, critical, note })),
    instructions,
  };
}

function proposedRevision(scored, plan) {
  const next = {
    stem: scored.stem,
    choices: scored.choices,
    rationale: scored.rationale,
    whyWrong: scored.whyWrong,
  };
  const notes = [];
  if (plan.rewriteFields.includes("stem")) {
    notes.push("Stem needs human/LLM rewrite into a PN clinical judgment scenario before approval.");
  }
  if (plan.rewriteFields.includes("distractors")) {
    notes.push("Distractors need targeted rewrite; do not change the correct answer without clinical review.");
  }
  if (plan.rewriteFields.includes("rationale")) {
    notes.push("Rationale needs expanded teaching and why-wrong explanations.");
  }
  return { ...next, rewriteNotes: notes, rewriteStatus: notes.length ? "rewrite_required" : "no_rewrite_required" };
}

function projectedRescore(scored, plan) {
  const projectedRubric = JSON.parse(JSON.stringify(scored.rubric));
  for (const field of plan.rewriteFields) {
    if (field === "stem") {
      projectedRubric.nclexDecisionFocus.score = Math.max(projectedRubric.nclexDecisionFocus.score || 0, 3);
      projectedRubric.stemClarity.score = Math.max(projectedRubric.stemClarity.score || 0, 3);
      projectedRubric.cognitiveLevel.score = Math.max(projectedRubric.cognitiveLevel.score || 0, 3);
    }
    if (field === "distractors") projectedRubric.distractorPlausibility.score = Math.max(projectedRubric.distractorPlausibility.score || 0, 3);
    if (field === "rationale") projectedRubric.rationaleQuality.score = Math.max(projectedRubric.rationaleQuality.score || 0, 3);
    if (field === "metadata") projectedRubric.taggingMetadata.score = Math.max(projectedRubric.taggingMetadata.score || 0, 3);
  }
  return scoreQualityRubric(projectedRubric);
}

export function selectImprovementCandidates(candidates, limit = 10) {
  return [...candidates]
    .filter((candidate) => candidate.id && candidate.stem && candidate.choices?.length)
    .sort((a, b) => {
      const approvedDelta = (b.status === "reviewed_approved") - (a.status === "reviewed_approved");
      if (approvedDelta) return approvedDelta;
      const riskRank = (candidate) => candidate.audit?.primaryRiskLabel === "low_similarity_risk" ? 0 : candidate.audit?.primaryRiskLabel === "medium_similarity_risk" ? 1 : 2;
      const riskDelta = riskRank(a) - riskRank(b);
      if (riskDelta) return riskDelta;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

export function buildImprovementLoop(candidates, options = {}) {
  const limit = Number(options.limit || 10);
  const selected = selectImprovementCandidates(candidates, limit);
  const items = selected.map((candidate) => {
    const scored = scoreQuestionCandidate(candidate);
    const rewritePlan = buildRewritePlan(scored);
    return {
      id: scored.id,
      status: scored.status,
      itemType: scored.itemType,
      initialScore: scored.qualityScore,
      rubric: scored.rubric,
      rewritePlan,
      originalQuestion: {
        stem: scored.stem,
        choices: scored.choices,
        correctAnswerIndexes: scored.correctAnswerIndexes,
        rationale: scored.rationale,
        whyWrong: scored.whyWrong,
        tagging: scored.tagging,
      },
      proposedRevision: proposedRevision(scored, rewritePlan),
      rescore: projectedRescore(scored, rewritePlan),
      nextHumanAction: rewritePlan.rewriteFields.length
        ? "Rewrite targeted fields, then score manually in Admin Review."
        : "Candidate already clears automated rubric; perform human clinical/source-safety review before approval.",
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    loopVersion: "1.0.0",
    mode: "heuristic_first_pass_no_paid_model",
    summary: {
      selectedCount: items.length,
      publishReadyInitial: items.filter((item) => item.initialScore.level === "publish_ready").length,
      rewriteRequired: items.filter((item) => item.rewritePlan.rewriteFields.length > 0).length,
      projectedPublishReady: items.filter((item) => item.rescore.level === "publish_ready").length,
    },
    items,
  };
}

async function readJson(filePath, fallback = []) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function readJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const value = await readJson(path.join(dir, entry.name), []);
    out.push(...(Array.isArray(value) ? value : [value]));
  }
  return out;
}

async function loadRealCandidates() {
  const approved = (await readJsonFiles(path.join(pipelineRoot, "approved_questions")))
    .map((item) => normalizeCandidate(item, { status: "reviewed_approved" }));
  const drafts = await readJsonFiles(path.join(pipelineRoot, "original_drafts"));
  const queue = await readJsonFiles(path.join(pipelineRoot, "clinical_review_queue"));
  const audits = await readJsonFiles(path.join(pipelineRoot, "similarity_audits"));
  const queueById = new Map(queue.map((item) => [itemId(item), item]));
  const auditById = new Map(audits.map((audit) => [audit.newQuestionId, audit]));
  const generated = drafts.map((draft) => {
    const id = itemId(draft);
    return normalizeCandidate({ ...draft, ...(queueById.get(id) || {}) }, {
      status: draft.reviewStatus || "generated_review_candidate",
      audit: auditById.get(id),
    });
  });
  const approvedIds = new Set(approved.map((item) => item.id));
  return [...approved, ...generated.filter((item) => !approvedIds.has(item.id))];
}

function scanUnsafe(value, hits = [], trail = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanUnsafe(entry, hits, [...trail, String(index)]));
    return hits;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (PRIVATE_KEY_RE.test(key) && trail[0] !== "originalQuestion") hits.push({ path: [...trail, key].join("."), reason: "private-looking-key" });
      scanUnsafe(entry, hits, [...trail, key]);
    }
    return hits;
  }
  if (typeof value === "string" && UNSAFE_TEXT_RE.test(value)) hits.push({ path: trail.join("."), reason: "unsafe-text-pattern" });
  return hits;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 10;
  const candidates = await loadRealCandidates();
  const loop = buildImprovementLoop(candidates, { limit });
  const unsafeHits = scanUnsafe(loop);
  if (unsafeHits.length) {
    throw new Error(`Improvement loop output contains unsafe/private patterns: ${JSON.stringify(unsafeHits.slice(0, 10))}`);
  }
  const outputDir = defaultOutputDir;
  const filePath = path.join(outputDir, `nclex_improvement_loop_${limit}.json`);
  const summaryPath = path.join(outputDir, `nclex_improvement_loop_${limit}_summary.json`);
  await writeJson(filePath, loop);
  await writeJson(summaryPath, { generatedAt: loop.generatedAt, mode: loop.mode, summary: loop.summary, output: filePath });
  console.log(JSON.stringify({ ok: true, output: filePath, summary: loop.summary }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
