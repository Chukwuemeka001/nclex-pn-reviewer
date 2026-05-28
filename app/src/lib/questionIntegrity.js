function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

export function normalizeChoices(raw = {}) {
  return raw.answerChoices || raw.choices || raw.newAnswerChoices || [];
}

export function canonicalCorrectAnswerText({ choices = [], correctAnswerIndexes = [] } = {}) {
  return asArray(correctAnswerIndexes)
    .map((i) => Number(i))
    .filter((i) => Number.isInteger(i) && i >= 0 && i < choices.length)
    .map((i) => choices[i]);
}

export function validateQuestionIntegrity(raw = {}, { strictItemType = false } = {}) {
  const errors = [];
  const warnings = [];

  const choices = normalizeChoices(raw);
  const correctAnswerIndexes = asArray(raw.correctAnswerIndexes).map((i) => Number(i));
  const uniqueIndexes = [...new Set(correctAnswerIndexes)];

  if (!Array.isArray(choices) || choices.length < 2) {
    errors.push("answerChoices must have at least 2 options");
  }

  if (!uniqueIndexes.length) {
    errors.push("correctAnswerIndexes must contain at least one index");
  }

  for (const idx of uniqueIndexes) {
    if (!Number.isInteger(idx)) {
      errors.push(`correctAnswerIndexes contains non-integer value: ${idx}`);
      continue;
    }
    if (idx < 0 || idx >= choices.length) {
      errors.push(`correctAnswerIndexes contains out-of-range index: ${idx}`);
    }
  }

  const itemType = raw.itemType || "multiple_choice";
  if (strictItemType) {
    if (itemType === "multiple_choice" && uniqueIndexes.length !== 1) {
      errors.push("multiple_choice items must have exactly one correct answer index");
    }
    if ((itemType === "select_all_that_apply" || itemType === "multiple_response") && uniqueIndexes.length < 2) {
      errors.push("select_all_that_apply items must have at least two correct answer indexes");
    }
  }

  const expectedText = canonicalCorrectAnswerText({ choices, correctAnswerIndexes: uniqueIndexes });
  const providedText = asArray(raw.correctAnswerText).filter(Boolean);

  if (providedText.length && JSON.stringify(providedText) !== JSON.stringify(expectedText)) {
    errors.push("correctAnswerText does not match answerChoices at correctAnswerIndexes");
  }

  const whyWrong = asArray(raw.whyWrong);
  if (whyWrong.length && whyWrong.length !== choices.length) {
    errors.push("whyWrong length must match answerChoices length when provided");
  }

  if (whyWrong.length && uniqueIndexes.length === 1) {
    const correctIdx = uniqueIndexes[0];
    const atKey = (whyWrong[correctIdx] ?? "").trim();
    if (atKey !== "") {
      warnings.push("whyWrong at correct answer index should be blank");
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    normalized: {
      choices,
      correctAnswerIndexes: uniqueIndexes,
      correctAnswerText: expectedText,
    },
  };
}

export function assessSingleAnswerPositionBalance(items = [], { maxShare = 0.5, minDistinct = 3 } = {}) {
  const singles = items.filter((item) => Array.isArray(item.correctAnswerIndexes) && item.correctAnswerIndexes.length === 1);
  if (!singles.length) {
    return { passed: true, issues: [], histogram: {} };
  }

  const counts = new Map();
  for (const item of singles) {
    const idx = Number(item.correctAnswerIndexes[0]);
    counts.set(idx, (counts.get(idx) || 0) + 1);
  }

  const total = singles.length;
  const distinct = counts.size;
  const maxCount = Math.max(...counts.values());
  const largestShare = maxCount / total;

  const issues = [];
  if (distinct < minDistinct && total >= 6) {
    issues.push(`answer-key distribution uses only ${distinct} positions; expected at least ${minDistinct}`);
  }
  if (largestShare > maxShare && total >= 6) {
    issues.push(`largest answer-key share is ${(largestShare * 100).toFixed(1)}%, above ${(maxShare * 100).toFixed(1)}%`);
  }

  return {
    passed: issues.length === 0,
    issues,
    histogram: Object.fromEntries(counts),
  };
}
