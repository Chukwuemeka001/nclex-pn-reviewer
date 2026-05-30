import demoSeedQuestions from "../data/demo_seed_questions.json" assert { type: "json" };
import servedArtifact from "../data/served_questions.json" assert { type: "json" };
import { validateQuestionIntegrity } from "./questionIntegrity.js";
import { assessDistractorPlausibility } from "./distractorQuality.js";
import { assessLearnerFriendlyRationale } from "./learnerFriendlyRationale.js";
import { buildBlueprintRef } from "./blueprint.js";

const REVIEW_API_BASE = import.meta?.env?.VITE_REVIEW_API_BASE || "/api/review";

function tagId(tag) {
  if (!tag) return "";
  if (typeof tag === "string") return tag;
  return tag.id || "";
}

function normalizeItemType(value) {
  if (value === "multiple_response" || value === "select_all_that_apply") return "select_all_that_apply";
  return "multiple_choice";
}

function difficultyNumber(question) {
  if (typeof question.difficulty === "number") return Math.min(5, Math.max(1, question.difficulty));
  const id = tagId(question.tagging?.difficulty);
  if (id === "easy") return 1;
  if (id === "medium") return 3;
  if (id === "medium-high") return 4;
  if (id === "hard") return 5;
  return 3;
}

function normalizeQuestion(raw, source = "approved") {
  const now = new Date().toISOString();
  const itemType = normalizeItemType(raw.itemType || raw.tagging?.questionType?.id);
  const integrity = validateQuestionIntegrity({ ...raw, itemType }, { strictItemType: false, requireWhyWrong: true });
  const choices = integrity.normalized.choices;
  const correctAnswerIndexes = integrity.normalized.correctAnswerIndexes;
  const correctAnswerText = integrity.normalized.correctAnswerText;
  const id = raw.id || raw.newQuestionId || "unknown";

  if (!integrity.passed) {
    throw new Error(`Question integrity failed for ${id}: ${integrity.errors.join("; ")}`);
  }

  const whyWrong = raw.whyWrong || [];

  // Distractor plausibility is a hard floor for every served item, including the
  // demo fallback: a cartoonishly-unsafe or stem-giveaway option must never ship.
  const distractors = assessDistractorPlausibility({ stem: raw.stem || raw.newStem || "", choices, correctAnswerIndexes });
  if (!distractors.passed) {
    throw new Error(`Distractor quality failed for ${id}: ${distractors.issues.join("; ")}`);
  }

  // Learner-rationale is a hard floor for every served item, including the demo
  // fallback. Per-option whyWrong presence/structure is enforced above via the
  // requireWhyWrong integrity option.
  const rationaleCheck = assessLearnerFriendlyRationale({ rationale: raw.rationale || raw.newRationale || "", whyWrong });
  if (!rationaleCheck.passed) {
    throw new Error(`Rationale quality failed for ${id}: ${rationaleCheck.issues.join("; ")}`);
  }

  return {
    id: raw.id || raw.newQuestionId || crypto.randomUUID(),
    status: raw.status || raw.reviewStatus || "reviewed_approved",
    examProgram: raw.examProgram || raw.tagging?.examProgram?.id || "nclex-pn",
    itemType,
    stem: raw.stem || raw.newStem || "",
    choices,
    correctAnswerIndexes,
    correctAnswerText,
    rationale: raw.rationale || raw.newRationale || "",
    whyWrong,
    tagging: raw.tagging || {},
    difficulty: difficultyNumber(raw),
    estimatedTimeSeconds: raw.estimatedTimeSeconds || raw.tagging?.estimatedTimeSeconds || (itemType === "select_all_that_apply" ? 90 : 60),
    review: raw.review || { status: source === "demo" ? "demo_seed" : "reviewed_approved" },
    source,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    blueprintRef: raw.blueprintRef || buildBlueprintRef(raw.tags || {}),
  };
}

async function loadApprovedFromReviewApi() {
  try {
    const response = await fetch(`${REVIEW_API_BASE}/state`);
    if (!response.ok) return [];
    const state = await response.json();
    return Array.isArray(state.approved) ? state.approved : [];
  } catch {
    return [];
  }
}

function loadBundledApprovedQuestions() {
  const artifact = servedArtifact;
  if (!artifact || artifact.schemaVersion !== "served-questions.v1") return [];
  return Array.isArray(artifact.questions) ? artifact.questions : [];
}

export async function loadQuestions() {
  const apiApproved = await loadApprovedFromReviewApi();
  const bundled = loadBundledApprovedQuestions();

  const approved = apiApproved.length > 0 ? apiApproved : bundled;
  const source = apiApproved.length > 0 ? "approved-api" : bundled.length > 0 ? "approved-bundled" : "demo";

  if (source === "demo") {
    console.warn("[questionLoader] No approved content available; serving demo seed as last resort.");
  }

  const rawItems = source === "demo" ? demoSeedQuestions : approved;
  const questions = rawItems.map((item) => normalizeQuestion(item, source === "demo" ? "demo" : "approved"));
  return {
    source,
    questions,
    approvedCount: approved.length,
    demoCount: demoSeedQuestions.length,
  };
}

export function getTagOptions(questions, tagPath) {
  const seen = new Map();
  for (const question of questions) {
    const value = tagPath.split(".").reduce((current, key) => current?.[key], question.tagging);
    const tags = Array.isArray(value) ? value : value ? [value] : [];
    for (const tag of tags) {
      const id = tagId(tag);
      if (id) seen.set(id, tag.label || id);
    }
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function filterQuestions(questions, filters) {
  const matchesSingle = (question, key, selected) => {
    if (!selected) return true;
    return tagId(question.tagging?.[key]) === selected;
  };
  const matchesMulti = (question, key, selected) => {
    if (!selected?.length) return true;
    const ids = new Set((question.tagging?.[key] || []).map(tagId));
    return selected.some((id) => ids.has(id));
  };

  return questions.filter((question) =>
    matchesSingle(question, "clientNeedsCategory", filters.clientNeedsCategory) &&
    matchesSingle(question, "clientNeedsSubcategory", filters.clientNeedsSubcategory) &&
    matchesSingle(question, "clinicalJudgmentStep", filters.clinicalJudgmentStep) &&
    matchesSingle(question, "questionType", filters.questionType) &&
    matchesSingle(question, "difficulty", filters.difficulty) &&
    matchesMulti(question, "topicTags", filters.topicTags) &&
    matchesMulti(question, "populationTags", filters.populationTags) &&
    matchesMulti(question, "safetyTags", filters.safetyTags) &&
    matchesMulti(question, "skillTags", filters.skillTags) &&
    matchesMulti(question, "bodySystemTags", filters.bodySystemTags)
  );
}
