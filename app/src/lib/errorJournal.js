export const ERROR_JOURNAL_STORAGE_KEY = "nclexPnErrorJournal.v1";

function labels(values = []) {
  return values.map((value) => value?.label || value?.id || value).filter(Boolean);
}

function questionTags(question = {}) {
  const tagging = question.tagging || {};
  return {
    clientNeeds: tagging.clientNeedsCategory?.label || tagging.clientNeedsCategory?.id || "Uncategorized",
    clinicalJudgment: tagging.clinicalJudgmentStep?.label || tagging.clinicalJudgmentStep?.id || "Clinical judgment",
    topics: labels(tagging.topicTags),
    safety: labels(tagging.safetyTags),
  };
}

export function buildErrorJournalEntries(result = {}, options = {}) {
  const flagged = new Set(result.flaggedIds || []);
  const now = options.now || new Date().toISOString();
  const entries = [];
  for (const item of result.scored || []) {
    const question = item.question || {};
    const isFlagged = flagged.has(question.id);
    const isIncorrect = !item.score?.isCorrect;
    if (!isIncorrect && !isFlagged) continue;
    const trigger = isIncorrect ? "incorrect" : "flagged";
    entries.push({
      questionId: question.id,
      stem: question.stem,
      rationale: question.rationale,
      selectedIndexes: item.response?.selectedIndexes || [],
      correctAnswerIndexes: item.score?.correctAnswerIndexes || question.correctAnswerIndexes || [],
      reason: options.defaultReason || (isIncorrect ? "unknown_miss_reason" : "flagged_for_review"),
      trigger,
      tags: questionTags(question),
      status: "needs_remediation",
      attempts: 1,
      createdAt: now,
      updatedAt: now,
      remediationNote: "",
    });
  }
  return entries;
}

export function mergeJournalEntries(existing = [], incoming = []) {
  const byId = new Map(existing.map((entry) => [entry.questionId, { ...entry }]));
  for (const entry of incoming) {
    const current = byId.get(entry.questionId);
    if (current) {
      byId.set(entry.questionId, {
        ...current,
        ...entry,
        attempts: Number(current.attempts || 1) + Number(entry.attempts || 1),
        createdAt: current.createdAt || entry.createdAt,
        updatedAt: entry.updatedAt || current.updatedAt,
      });
    } else {
      byId.set(entry.questionId, { ...entry });
    }
  }
  return [...byId.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

export function summarizeErrorJournal(entries = []) {
  const byReason = {};
  const byStatus = {};
  const byClientNeeds = {};
  for (const entry of entries) {
    byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
    byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    const clientNeeds = entry.tags?.clientNeeds || "Uncategorized";
    byClientNeeds[clientNeeds] = (byClientNeeds[clientNeeds] || 0) + 1;
  }
  return { total: entries.length, byReason, byStatus, byClientNeeds };
}

export function buildRemediationPlan(entries = [], limit = 5) {
  const active = entries.filter((entry) => entry.status !== "reviewed").slice(0, limit);
  const tasks = [];
  for (const entry of active) {
    const priorityTag = entry.tags?.safety?.[0] || entry.tags?.topics?.[0] || entry.tags?.clientNeeds || "PN safety";
    tasks.push({
      questionId: entry.questionId,
      task: `Review ${priorityTag}: explain why the correct answer is safest before rereading the rationale.`,
      reason: entry.reason,
      minutes: 6,
    });
    if (entry.tags?.clinicalJudgment) {
      tasks.push({
        questionId: entry.questionId,
        task: `Practice ${entry.tags.clinicalJudgment}: write the cue, decision, and first nursing action in one sentence.`,
        reason: entry.reason,
        minutes: 4,
      });
    }
  }
  return tasks.slice(0, limit * 2);
}

export function exportErrorJournalBackup(entries = [], options = {}) {
  return {
    schemaVersion: 1,
    exportedAt: options.exportedAt || new Date().toISOString(),
    app: "nclex-pn-daily-trainer",
    storageWarning: "Prototype backup from local browser storage. Not a medical record.",
    entries: entries.map((entry) => ({ ...entry })),
  };
}

export function importErrorJournalBackup(value) {
  const issues = [];
  let parsed;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return { entries: [], issues: [`Invalid JSON: ${error.message}`] };
  }
  const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries;
  if (!Array.isArray(rawEntries)) return { entries: [], issues: ["Backup must contain an entries array."] };
  const entries = [];
  for (const [index, entry] of rawEntries.entries()) {
    if (!entry?.questionId) {
      issues.push(`Entry ${index} missing questionId.`);
      continue;
    }
    entries.push({
      ...entry,
      reason: entry.reason || "unknown_miss_reason",
      status: entry.status || "needs_remediation",
      attempts: Number(entry.attempts || 1),
      updatedAt: entry.updatedAt || new Date().toISOString(),
    });
  }
  return { entries, issues };
}

export function loadErrorJournal(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    return JSON.parse(storage.getItem(ERROR_JOURNAL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveErrorJournal(entries, storage = globalThis.localStorage) {
  if (!storage) return entries;
  storage.setItem(ERROR_JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  return entries;
}
