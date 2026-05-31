export function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*\[rw\]\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function deriveQuestionFamilyKey(question = {}) {
  const explicit = String(question.familyKey || question.variantGroup || "").trim();
  if (explicit) return explicit;

  const id = String(question.id || question.newQuestionId || "").trim();
  const idMatch = id.match(/^(.*)_variant_[a-z0-9]+$/i);
  if (idMatch?.[1]) return idMatch[1];

  const tagFamily = [
    question?.tags?.clientNeeds,
    question?.tags?.subcategory,
    question?.tags?.clinicalJudgment,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join("|");
  if (tagFamily) return `tag:${tagFamily}`;

  const stem = normalizeText(question.stem || question.newStem || "");
  if (!stem) return id || "unknown";
  return `stem:${stem}`;
}
