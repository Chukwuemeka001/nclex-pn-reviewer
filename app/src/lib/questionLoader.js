import demoSeedQuestions from "../data/demo_seed_questions.json";

const REVIEW_API_BASE = import.meta.env.VITE_REVIEW_API_BASE || "/api/review";

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

import { validateQuestionIntegrity } from "./questionIntegrity.js";

function normalizeQuestion(raw, source = "approved") {
  const now = new Date().toISOString();
  const itemType = normalizeItemType(raw.itemType || raw.tagging?.questionType?.id);
  const integrity = validateQuestionIntegrity({ ...raw, itemType }, { strictItemType: false });
  const choices = integrity.normalized.choices;
  const correctAnswerIndexes = integrity.normalized.correctAnswerIndexes;
  const correctAnswerText = integrity.normalized.correctAnswerText;

  if (!integrity.passed) {
    const id = raw.id || raw.newQuestionId || "unknown";
    throw new Error(`Question integrity failed for ${id}: ${integrity.errors.join("; ")}`);
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
    whyWrong: raw.whyWrong || [],
    tagging: raw.tagging || {},
    difficulty: difficultyNumber(raw),
    estimatedTimeSeconds: raw.estimatedTimeSeconds || raw.tagging?.estimatedTimeSeconds || (itemType === "select_all_that_apply" ? 90 : 60),
    review: raw.review || { status: source === "demo" ? "demo_seed" : "reviewed_approved" },
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
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
  return [];
}

export async function loadQuestions() {
  const apiApproved = await loadApprovedFromReviewApi();
  const approved = apiApproved.length > 0 ? apiApproved : loadBundledApprovedQuestions();

  const source = approved.length > 0 ? "approved" : "demo";
  const questions = (approved.length > 0 ? approved : demoSeedQuestions).map((item) => normalizeQuestion(item, source));
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
