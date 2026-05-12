function uniqueSourceIds(item = {}) {
  const ids = [];
  const push = (value) => {
    if (value && !ids.includes(value)) ids.push(value);
  };

  for (const attribution of item.publicAttributions || []) push(attribution.sourceId);
  for (const ref of item.sourceConceptRefs || []) push(ref.sourceId);
  for (const ref of item.sourceRefs || []) push(ref.sourceId);
  if (item.sourceId) push(item.sourceId);

  return ids;
}

export function summarizeModelAssistedRewrite(item = {}) {
  const rewrite = item.modelAssistedRewrite || item.review?.modelAssistedRewrite || item.audit?.modelAssistedRewrite || null;
  if (!rewrite) {
    return {
      hasRewrite: false,
      displayText: "No model-assisted rewrite has been applied to this draft.",
      fieldsApplied: [],
    };
  }

  const fieldsApplied = Array.isArray(rewrite.fieldsApplied)
    ? rewrite.fieldsApplied
    : Array.isArray(rewrite.appliedFields)
      ? rewrite.appliedFields
      : [];

  const reviewerName = rewrite.reviewerName || rewrite.appliedBy || "Unknown reviewer";
  const reviewerNote = rewrite.reviewerNote || rewrite.note || "No reviewer note recorded.";
  const sourceSafetyStatement = rewrite.sourceSafetyStatement || rewrite.clinicalSafetyAssertion || "No source-safety statement recorded.";
  const appliedAt = rewrite.appliedAt || rewrite.timestamp || "time not recorded";

  return {
    hasRewrite: true,
    appliedAt,
    reviewerName,
    reviewerNote,
    sourceSafetyStatement,
    fieldsApplied,
    displayText: `${reviewerName} applied ${fieldsApplied.length || "unknown"} rewrite field(s) at ${appliedAt}. Note: ${reviewerNote}`,
  };
}

export function findSourceRegistryEntriesForItem(item = {}, registry = []) {
  const byId = new Map((registry || []).map((entry) => [entry.sourceId, entry]));
  return uniqueSourceIds(item).map((sourceId) => {
    const entry = byId.get(sourceId);
    if (!entry) {
      return {
        sourceId,
        found: false,
        title: "Unregistered source",
        issues: ["This sourceId is not in the source registry."],
      };
    }
    return {
      ...entry,
      sourceId,
      found: true,
      allowedUse: entry.allowedUse || [],
      prohibitedUse: entry.prohibitedUse || [],
      attributionRequired: Boolean(entry.attributionRequired),
    };
  });
}
