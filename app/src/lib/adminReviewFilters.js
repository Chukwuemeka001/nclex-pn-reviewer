function itemText(entry = {}) {
  const item = entry.item || entry;
  return [
    item.newQuestionId,
    item.id,
    item.newStem,
    item.stem,
    item.itemType,
    item.tagging?.clientNeedsCategory?.label,
    item.tagging?.clientNeedsSubcategory?.label,
    ...(item.tagging?.topicTags || []).map((tag) => tag.label || tag.id),
  ].filter(Boolean).join(" ").toLowerCase();
}

function hasModelAssistedRewrite(entry = {}) {
  const item = entry.item || entry;
  return Boolean(item.modelAssistedRewrite || item.review?.modelAssistedRewrite || item.audit?.modelAssistedRewrite);
}

export function filterReviewEntries(entries = [], options = {}) {
  const query = String(options.query || "").trim().toLowerCase();
  return entries.filter((entry) => {
    if (options.modelAssistedOnly && !hasModelAssistedRewrite(entry)) return false;
    if (query && !itemText(entry).includes(query)) return false;
    return true;
  });
}
