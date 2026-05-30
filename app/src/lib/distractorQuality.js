const CARTOON_UNSAFE_PATTERNS = [
  /without (a |an )?(provider|physician|prescriber|doctor|order|prescription)/i,
  /ignore (the )?(order|allergy|vital|symptom|pain|bleeding|complaint|call light|call bell|alarm|fall|wound|rash|fever|request)/i,
  /leave (the )?client (alone|unattended|on the floor)/i,
  /force (fluids|food|ambulation|walking|the client)/i,
  /restrain .* without/i,
  /(give|administer) .* despite .* allergy/i,
  /(double|triple|increase) the (dose|dosage|rate)( of \w+)? (without|on your own|independently)/i,
  /(stop|withhold|discontinue) the (prescribed |ordered )?(medication|antibiotic|insulin|oxygen) without/i,
  /tell the client to stop taking/i,
  /reuse (the |a |an )?(same |used |dirty )?(needle|syringe|glove)/i,
  /recap (the |a )?(used )?needle/i,
  /without (washing|cleaning) (your |the )?hands/i,
  /without (performing )?hand (hygiene|washing)/i,
  /skip(ping)? (the )?(assessment|vital signs|hand hygiene|verification|safety check|time-?out)/i,
];

function normalizeChoices(choices = []) {
  return Array.isArray(choices) ? choices.map((choice) => String(choice || "").trim()).filter(Boolean) : [];
}

function meaningfulTokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !new Set(["client", "nurse", "which", "should", "first", "report", "finding", "action", "take", "what", "with", "that", "this", "care", "after", "before", "because", "would", "could", "offer", "document", "review"]).has(token));
}

function answerGiveawayScore(stem, choice) {
  const stemTokens = new Set(meaningfulTokens(stem));
  const choiceTokens = meaningfulTokens(choice);
  if (!stemTokens.size || !choiceTokens.length) return 0;
  const overlap = choiceTokens.filter((token) => stemTokens.has(token));
  return overlap.length / Math.max(1, choiceTokens.length);
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
  const correctChoices = normalizedChoices.filter((_, index) => correct.has(index));
  const giveawayCorrect = correctChoices.some((choice) => answerGiveawayScore(stem, choice) >= 0.55);
  const giveawayWrong = normalizedChoices.filter((choice, index) => !correct.has(index) && answerGiveawayScore(stem, choice) >= 0.55);
  if (giveawayCorrect && giveawayWrong.length === 0) {
    issues.push("Correct answer may be guessed from wording overlap with the stem. Rewrite options so nursing judgment, not repeated wording, identifies the answer.");
  }
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
    "Avoid repeating the exact stem wording only in the correct answer; otherwise learners can guess without nursing knowledge.",
    "For constipation, better distractors include checking diet/fluid restrictions, reviewing prescribed stool softeners, encouraging mobility as tolerated, or assessing bowel pattern before intervention.",
  ];
}
