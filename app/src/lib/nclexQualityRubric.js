export const NCLEX_QUALITY_RUBRIC = [
  {
    id: "clinicalAccuracy",
    label: "Clinical accuracy",
    critical: true,
    prompt: "Facts, priority action, contraindications, and nursing scope are clinically correct.",
    anchors: {
      0: "Unsafe or clinically wrong.",
      1: "Major clinical doubt remains.",
      2: "Partly correct but needs nurse/educator review before use.",
      3: "Clinically acceptable with minor wording improvements.",
      4: "Clinically solid, safe, and defensible.",
    },
  },
  {
    id: "nclexDecisionFocus",
    label: "NCLEX decision focus",
    critical: false,
    prompt: "Stem forces a nursing judgment, priority, safety, delegation, teaching, or next-best-action decision instead of recall trivia.",
    anchors: {
      0: "Pure recall or fact lookup.",
      1: "Mostly recall with weak clinical decision.",
      2: "Some judgment, but answer can be guessed from wording.",
      3: "Clear nursing decision with one best answer.",
      4: "Feels like NCLEX: assess/intervene/prioritize/delegate/teach under realistic constraints.",
    },
  },
  {
    id: "stemClarity",
    label: "Stem clarity and realism",
    critical: false,
    prompt: "Scenario is concise, realistic, grammatically clean, and includes only data needed for the decision.",
    anchors: {
      0: "Confusing, broken, or unusable.",
      1: "Ambiguous or overloaded with irrelevant details.",
      2: "Understandable but not exam-polished.",
      3: "Clear and realistic.",
      4: "Concise NCLEX-style scenario with purposeful clinical cues.",
    },
  },
  {
    id: "answerKeyQuality",
    label: "Answer key quality",
    critical: true,
    prompt: "Correct option(s) are unambiguously best; item type matches number of correct responses.",
    anchors: {
      0: "Wrong key or multiple unintended correct answers.",
      1: "Likely key problem.",
      2: "Needs review; ambiguity remains.",
      3: "Correct answer is defensible.",
      4: "One best answer or correct SATA set is airtight.",
    },
  },
  {
    id: "distractorPlausibility",
    label: "Distractor plausibility",
    critical: false,
    prompt: "Wrong choices are clinically plausible but clearly less safe, less priority, or less complete than the key.",
    anchors: {
      0: "Distractors are obviously silly or unrelated.",
      1: "Most distractors are weak.",
      2: "Some plausible distractors, but item is too easy.",
      3: "Distractors are plausible and teachable.",
      4: "Distractors mirror common nursing-student traps without being unfair.",
    },
  },
  {
    id: "rationaleQuality",
    label: "Rationale quality",
    critical: true,
    prompt: "Rationale teaches the nursing principle and explains why wrong answers are wrong.",
    anchors: {
      0: "Missing or misleading rationale.",
      1: "Rationale only repeats the answer.",
      2: "Partly explains answer but weak why-wrong teaching.",
      3: "Explains correct answer and most distractors.",
      4: "Strong teaching rationale: principle, priority logic, and why-wrong explanations are clear.",
    },
  },
  {
    id: "cognitiveLevel",
    label: "Cognitive level",
    critical: false,
    prompt: "Question tests application/analysis/clinical judgment rather than memorization.",
    anchors: {
      0: "Memorization only.",
      1: "Low-level recognition.",
      2: "Some application.",
      3: "Application/analysis level.",
      4: "Clinical judgment with prioritization or cue interpretation.",
    },
  },
  {
    id: "pnScope",
    label: "PN scope fit",
    critical: true,
    prompt: "Expected action fits practical nursing scope and does not silently require RN/provider-only judgment.",
    anchors: {
      0: "Unsafe or outside PN scope.",
      1: "Scope mismatch likely.",
      2: "Scope unclear; needs review.",
      3: "Fits PN scope.",
      4: "Strong PN fit with appropriate escalation/delegation boundaries.",
    },
  },
  {
    id: "taggingMetadata",
    label: "Tagging and metadata",
    critical: false,
    prompt: "Client needs, clinical judgment step, body system/topic/skill/safety tags, difficulty, and item type are accurate.",
    anchors: {
      0: "Tags missing or wrong.",
      1: "Major tag problems.",
      2: "Partial tags; needs cleanup.",
      3: "Tags are usable.",
      4: "Tags are precise enough for analytics and weak-area drills.",
    },
  },
  {
    id: "originalitySafety",
    label: "Originality/source safety",
    critical: true,
    prompt: "Question is public-safe: no source wording, source scenario pattern, URLs, provider names, or private trace leakage.",
    anchors: {
      0: "Unsafe source/private leak.",
      1: "High source-derived risk.",
      2: "Possible source-pattern carryover; rewrite required.",
      3: "Low source risk after review.",
      4: "Original, clean, and safe for sanitized export.",
    },
  },
];

const CRITERIA_BY_ID = new Map(NCLEX_QUALITY_RUBRIC.map((criterion) => [criterion.id, criterion]));
export const QUALITY_RUBRIC_MAX_SCORE = NCLEX_QUALITY_RUBRIC.length * 4;
export const QUALITY_RUBRIC_PASSING_SCORE = 32;
export const QUALITY_RUBRIC_MIN_CRITICAL_SCORE = 3;

export function emptyQualityRubric() {
  return Object.fromEntries(NCLEX_QUALITY_RUBRIC.map((criterion) => [criterion.id, { score: "", note: "" }]));
}

function normalizeScore(value) {
  if (value === "" || value == null) return null;
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0 || score > 4) return null;
  return score;
}

export function scoreQualityRubric(rubric = {}) {
  let totalScore = 0;
  const rows = NCLEX_QUALITY_RUBRIC.map((criterion) => {
    const entry = rubric[criterion.id] || {};
    const score = normalizeScore(entry.score);
    const note = String(entry.note || "").trim();
    if (score != null) totalScore += score;
    return { ...criterion, score, note };
  });

  const blockers = [];
  for (const row of rows) {
    if (row.score == null) blockers.push(`${row.label} needs a 0-4 score.`);
    if (!row.note) blockers.push(`${row.label} needs a reviewer note.`);
    if (row.critical && row.score != null && row.score < QUALITY_RUBRIC_MIN_CRITICAL_SCORE) {
      blockers.push(`${row.label} is a critical criterion and must score at least ${QUALITY_RUBRIC_MIN_CRITICAL_SCORE}.`);
    }
  }
  if (totalScore < QUALITY_RUBRIC_PASSING_SCORE) blockers.push(`Total rubric score must be at least ${QUALITY_RUBRIC_PASSING_SCORE}/${QUALITY_RUBRIC_MAX_SCORE}.`);

  const percent = Math.round((totalScore / QUALITY_RUBRIC_MAX_SCORE) * 100);
  const level = blockers.length === 0 ? "publish_ready" : totalScore >= 24 ? "revise_before_publish" : "reject_or_rewrite";

  return {
    totalScore,
    maxScore: QUALITY_RUBRIC_MAX_SCORE,
    passingScore: QUALITY_RUBRIC_PASSING_SCORE,
    percent,
    level,
    blockers,
    rows,
  };
}

export function validateQualityRubric(rubric = {}) {
  return scoreQualityRubric(rubric).blockers;
}

export function normalizeQualityRubric(rubric = {}) {
  return Object.fromEntries(NCLEX_QUALITY_RUBRIC.map((criterion) => {
    const entry = rubric[criterion.id] || {};
    return [criterion.id, {
      score: normalizeScore(entry.score),
      note: String(entry.note || "").trim(),
    }];
  }));
}

export function rubricCriterion(id) {
  return CRITERIA_BY_ID.get(id) || null;
}
