const CARTOON_UNSAFE_PATTERNS = [
  /without (a |an )?(provider|physician|prescriber|doctor|order)/i,
  /ignore (the )?(order|allergy|vital|symptom|pain|bleeding)/i,
  /leave (the )?client (alone|on the floor)/i,
  /force (fluids|food|ambulation|walking)/i,
  /restrain .* without/i,
  /give .* despite .* allergy/i,
];

function normalizeChoices(choices = []) {
  return Array.isArray(choices) ? choices.map((choice) => String(choice || "").trim()).filter(Boolean) : [];
}

export function assessDistractorPlausibility({ stem = "", choices = [], correctAnswerIndexes = [] } = {}) {
  const normalizedChoices = normalizeChoices(choices);
  const correct = new Set(Array.isArray(correctAnswerIndexes) ? correctAnswerIndexes : []);
  const flaggedChoices = [];

  normalizedChoices.forEach((choice, index) => {
    if (correct.has(index)) return;
    const matchedPattern = CARTOON_UNSAFE_PATTERNS.find((pattern) => pattern.test(choice));
    if (matchedPattern) {
      flaggedChoices.push({
        index,
        choice,
        reason: "This distractor is too obviously unsafe or outside nursing scope, so it may feel AI-generated instead of NCLEX-plausible.",
      });
    }
  });

  const issues = [];
  if (flaggedChoices.length > 0) {
    issues.push("One or more distractors are too obviously unsafe. Replace with plausible nursing actions that are tempting but less complete, less urgent, or not the safest first step.");
  }
  if (normalizedChoices.length >= 4) {
    const shortWrong = normalizedChoices.filter((choice, index) => !correct.has(index) && choice.split(/\s+/).length <= 2);
    if (shortWrong.length >= 2) {
      issues.push("Several wrong answers are too short/generic. NCLEX-style distractors should look like realistic nursing options.");
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    flaggedChoices,
    stem: String(stem || ""),
  };
}

export function distractorRewriteGuidance() {
  return [
    "Avoid cartoonishly unsafe options such as giving medication without an order unless the item specifically tests that safety rule.",
    "Make wrong options plausible nursing actions that are less urgent, incomplete, or not the safest first step.",
    "For constipation, better distractors include checking diet/fluid restrictions, reviewing prescribed stool softeners, encouraging mobility as tolerated, or assessing bowel pattern before intervention.",
  ];
}
