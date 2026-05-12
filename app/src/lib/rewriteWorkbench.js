function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function scoreLabel(score = {}) {
  const total = Number.isFinite(score.totalScore) ? score.totalScore : "?";
  const max = Number.isFinite(score.maxScore) ? score.maxScore : "?";
  return `${total}/${max} ${score.level || "unscored"}`;
}

export function normalizeRewriteRequest(request = {}) {
  const allowedRewriteFields = uniq(request.allowedRewriteFields || []);
  const lockedFields = uniq(request.lockedFields || []);
  const input = request.input || {};
  return {
    id: request.id || "unknown",
    mode: request.mode || "targeted_model_rewrite_request",
    allowedRewriteFields,
    lockedFields,
    scoreLabel: scoreLabel(input.initialScore),
    weakestCriteria: input.weakestCriteria || [],
    instructions: input.instructions || [],
    currentFields: input.currentFields || {},
    correctAnswerIndexes: input.correctAnswerIndexes || [],
    itemType: input.itemType || "multiple_choice",
    systemPrompt: request.systemPrompt || "",
    userPrompt: request.userPrompt || "",
  };
}

export function applyModelRewrite(request, modelOutput = {}) {
  const normalized = normalizeRewriteRequest(request);
  const rewritten = modelOutput.rewrittenFields || {};
  const proposed = { ...normalized.currentFields };
  const blockedChanges = [];

  for (const [field, value] of Object.entries(rewritten)) {
    const normalizedField = field === "choices" ? "distractors" : field;
    if (normalized.allowedRewriteFields.includes(normalizedField)) {
      proposed[field] = value;
    } else {
      blockedChanges.push(field);
    }
  }

  return {
    id: normalized.id,
    proposed,
    blockedChanges: uniq(blockedChanges),
    reviewerWarnings: modelOutput.reviewerWarnings || [],
    changeSummary: modelOutput.changeSummary || [],
    sourceSafetyStatement: modelOutput.sourceSafetyStatement || "",
    reviewStatus: "needs_human_review",
  };
}

export function buildApplyRewritePayload(request, appliedRewrite, reviewer = {}) {
  const normalized = normalizeRewriteRequest(request);
  const proposed = appliedRewrite?.proposed || {};
  const current = normalized.currentFields || {};
  const rewrittenFields = {};

  for (const field of normalized.allowedRewriteFields) {
    const sourceField = field === "distractors" ? "choices" : field;
    if (Object.prototype.hasOwnProperty.call(proposed, sourceField) && JSON.stringify(proposed[sourceField]) !== JSON.stringify(current[sourceField])) {
      rewrittenFields[sourceField] = proposed[sourceField];
    }
  }

  return {
    id: normalized.id,
    rewrittenFields,
    allowedRewriteFields: normalized.allowedRewriteFields,
    lockedFields: normalized.lockedFields,
    reviewerName: reviewer.reviewerName || "",
    reviewerNote: reviewer.reviewerNote || "",
    sourceSafetyStatement: appliedRewrite?.sourceSafetyStatement || reviewer.sourceSafetyStatement || "",
    changeSummary: appliedRewrite?.changeSummary || [],
    reviewerWarnings: appliedRewrite?.reviewerWarnings || [],
    reviewStatus: "needs_human_review",
  };
}

export function buildReviewerChecklist(request = {}) {
  const normalized = normalizeRewriteRequest(request);
  const fields = normalized.allowedRewriteFields.join(", ") || "none";
  return [
    `Verify the rewrite changed only allowed fields: ${fields}.`,
    "Verify clinical accuracy, priority logic, and PN/LPN scope before approval.",
    "Verify source-safety: no copied phrasing, scenario structure, or branded/proprietary qbank pattern.",
    "Verify locked fields stayed unchanged unless a human reviewer deliberately approved the change.",
    "Re-score the NCLEX quality rubric after accepting any rewrite.",
  ];
}

export function summarizeRewriteBatch(batch = {}) {
  const requests = batch.requests || [];
  const fieldCounts = {};
  const weakCriteriaCounts = {};
  for (const request of requests) {
    const normalized = normalizeRewriteRequest(request);
    for (const field of normalized.allowedRewriteFields) fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    for (const criterion of normalized.weakestCriteria) weakCriteriaCounts[criterion.id] = (weakCriteriaCounts[criterion.id] || 0) + 1;
  }
  return {
    totalRequests: requests.length,
    provider: batch.provider || "manual_or_external_model",
    model: batch.model || "unspecified",
    fieldCounts,
    weakCriteriaCounts,
  };
}
