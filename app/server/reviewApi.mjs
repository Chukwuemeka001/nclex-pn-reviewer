import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQualityRubric, scoreQualityRubric, validateQualityRubric } from "../src/lib/nclexQualityRubric.js";
import { validateQuestionIntegrity as libValidateQuestionIntegrity } from "../src/lib/questionIntegrity.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const pipelineRoot = path.join(root, "qbank_pipeline");
const dirs = {
  originalDrafts: path.join(pipelineRoot, "original_drafts"),
  blueprints: path.join(pipelineRoot, "blueprints"),
  audits: path.join(pipelineRoot, "similarity_audits"),
  queue: path.join(pipelineRoot, "clinical_review_queue"),
  approved: path.join(pipelineRoot, "approved_questions"),
  rejected: path.join(pipelineRoot, "rejected_questions"),
  logs: path.join(pipelineRoot, "review_logs"),
  externalSubmissions: path.join(pipelineRoot, "external_review_submissions"),
};
const files = {
  tagIndex: path.join(pipelineRoot, "tag_index.json"),
  approved: path.join(dirs.approved, "review_console_approved_questions.json"),
  rejected: path.join(dirs.rejected, "review_console_rejected_questions.json"),
  events: path.join(dirs.logs, "review_events.json"),
  working: path.join(dirs.logs, "review_working_items.json"),
  externalSubmissionLog: path.join(dirs.logs, "external_review_submissions.jsonl"),
};

async function ensureDirs() {
  await Promise.all(Object.values(dirs).map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const filesInDir = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const loaded = [];
  for (const entry of filesInDir) {
    const value = await readJson(path.join(dir, entry.name), []);
    loaded.push(...(Array.isArray(value) ? value : [value]));
  }
  return loaded;
}

function idFromDraft(draft) {
  return draft.newQuestionId || draft.id;
}

function sourceIdFromAudit(audit) {
  return `${audit.sourceQuestionId || ""}::${audit.newQuestionId || ""}`;
}

function mapBy(items, fn) {
  const out = new Map();
  for (const item of items) out.set(fn(item), item);
  return out;
}

function questionTypeFromDraft(draft) {
  if (draft.itemType === "multiple_response" || draft.itemType === "select_all_that_apply") return "select_all_that_apply";
  return "multiple_choice";
}

function supportedItemType(item) {
  return ["multiple_choice", "multiple_response", "select_all_that_apply"].includes(item?.itemType);
}

function choicesFromItem(item) {
  return item.newAnswerChoices || item.answerChoices || item.choices || [];
}

function stemFromItem(item) {
  return item.newStem || item.stem || "";
}

function rationaleFromItem(item) {
  return item.newRationale || item.rationale || "";
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim());
  if (typeof value === "string") return [value.trim()];
  return [];
}

// Single source of truth: delegate to the shared lib validator so server
// approval, the question loader, and the test gates can never drift. We
// pre-resolve choices and correctAnswerText with the server's own field
// precedence (newAnswerChoices wins for rewritten drafts) and trimming, then
// re-shape the lib's { errors } into the server's { issues, integrityIssues }
// response contract.
function validateQuestionIntegrity(item = {}) {
  const choices = choicesFromItem(item).map((choice) => String(choice ?? "").trim());
  const correctAnswerText = normalizeTextArray(item.correctAnswerText);
  const result = libValidateQuestionIntegrity(
    { ...item, answerChoices: choices, correctAnswerText },
    { strictItemType: false },
  );
  return {
    passed: result.passed,
    issues: result.errors,
    integrityIssues: result.errors.map((message) => ({ code: "QUESTION_INTEGRITY", message })),
  };
}

function allWarnings(item) {
  return [
    ...(item.draftWarnings || []),
    ...(item.transformationWarnings || []),
    ...(item.sourceWarnings || []),
  ].filter(Boolean);
}

function blockingWarnings(item, resolvedWarnings = []) {
  const resolved = new Set(resolvedWarnings);
  return allWarnings(item).filter((warning) => {
    if (resolved.has(warning)) return false;
    if (/private draft from a concept blueprint/i.test(warning)) return false;
    return /warning|stale|hidden|offscreen|extraction|raw|source|missing|inferred|unsupported|image|confidence|duplicate|manual review/i.test(warning);
  });
}

function normalizeApprovedQuestion(item, meta) {
  const now = new Date().toISOString();
  const correctAnswerIndexes = item.correctAnswerIndexes || [];
  const choices = choicesFromItem(item);
  return {
    id: item.newQuestionId || item.id,
    status: "reviewed_approved",
    examProgram: item.tagging?.examProgram?.id || "nclex-pn",
    itemType: questionTypeFromDraft(item),
    stem: stemFromItem(item),
    choices,
    correctAnswerIndexes,
    correctAnswerText: correctAnswerIndexes.map((index) => choices[index]).filter(Boolean),
    rationale: rationaleFromItem(item),
    whyWrong: item.whyWrong || [],
    tagging: item.tagging,
    difficulty: item.difficulty || item.tagging?.difficulty?.id || "medium",
    estimatedTimeSeconds: item.tagging?.estimatedTimeSeconds || item.estimatedTimeSeconds || 60,
    review: {
      approvedBy: meta.approvedBy,
      approvedAt: now,
      reviewNotes: meta.reviewNotes || "",
      sourceBlueprintId: meta.sourceBlueprintId,
      similarityAuditId: meta.similarityAuditId,
      contentVersion: meta.contentVersion || "1.0.0",
      similarityOverride: Boolean(meta.similarityOverride),
      similarityOverrideNote: meta.similarityOverrideNote || "",
      qualityRubric: normalizeQualityRubric(meta.qualityRubric),
      qualityScore: scoreQualityRubric(meta.qualityRubric),
    },
    createdAt: item.createdAt || now,
    updatedAt: now,
  };
}

function validateTagging(tagging) {
  if (!tagging) return ["Missing tagging object."];
  const issues = [];
  for (const key of ["clientNeedsCategory", "clientNeedsSubcategory", "clinicalJudgmentStep", "questionType", "difficulty"]) {
    if (!tagging[key]?.id) issues.push(`Missing ${key}.`);
  }
  const combined = [
    ...(tagging.topicTags || []),
    ...(tagging.skillTags || []),
    ...(tagging.bodySystemTags || []),
  ];
  if (combined.length < 2) issues.push("Needs at least 2 topic/skill/body-system tags combined.");
  return issues;
}

function approvalIssues(item, audit, meta) {
  const issues = [];
  const risk = meta.similarityRisk || audit?.primaryRiskLabel || item.similarityRisk;
  const override = Boolean(meta.similarityOverride && meta.similarityOverrideNote?.trim());
  if (risk !== "low_similarity_risk" && !override) issues.push("Similarity risk is not low and no manual override note was provided.");
  if (meta.clinicalReviewStatus !== "reviewed_passed") issues.push("Clinical review status must be reviewed_passed.");
  if (meta.tagReviewStatus !== "reviewed_passed") issues.push("Tag review status must be reviewed_passed.");
  if (!supportedItemType(item)) issues.push("Unsupported item type.");
  if (!stemFromItem(item).trim()) issues.push("Stem is empty.");
  if (!Array.isArray(choicesFromItem(item)) || choicesFromItem(item).length < 2) issues.push("Choices are invalid.");
  if (!Array.isArray(item.correctAnswerIndexes) || item.correctAnswerIndexes.length < 1) issues.push("Correct answer is missing.");
  if (!rationaleFromItem(item).trim()) issues.push("Rationale is missing.");
  const integrity = validateQuestionIntegrity(item);
  if (!integrity.passed) issues.push(...integrity.issues);
  issues.push(...validateTagging(item.tagging));
  issues.push(...validateQualityRubric(meta.qualityRubric));
  const unresolved = blockingWarnings(item, meta.resolvedWarnings || []);
  if (unresolved.length) issues.push("Unresolved transformation warnings remain.");
  return issues;
}

function fastReviewIssues(entry, meta = {}) {
  const item = entry.item;
  const audit = entry.audit || {};
  const issues = [];
  const risk = audit.primaryRiskLabel || item.similarityRisk;
  if (entry.status === "approved") issues.push("Already approved.");
  if (entry.status === "rejected") issues.push("Already rejected.");
  if (risk !== "low_similarity_risk") issues.push("Similarity risk is not low.");
  if (audit.riskLabels?.includes("clinical_review_required") || item.clinicalReviewStatus === "clinical_review_required") {
    issues.push("Clinical review is required.");
  }
  if (!supportedItemType(item)) issues.push("Unsupported item type.");
  if (!stemFromItem(item).trim()) issues.push("Stem is empty.");
  if (!Array.isArray(choicesFromItem(item)) || choicesFromItem(item).length < 2) issues.push("Choices are invalid.");
  if (!Array.isArray(item.correctAnswerIndexes) || item.correctAnswerIndexes.length < 1) issues.push("Correct answer is missing.");
  if (!rationaleFromItem(item).trim()) issues.push("Rationale is missing.");
  issues.push(...validateTagging(item.tagging));
  const unresolved = blockingWarnings(item, meta.resolvedWarnings || []);
  if (unresolved.length) issues.push(`Unresolved warning flags: ${unresolved.join(" | ")}`);
  return issues;
}

async function loadState() {
  await ensureDirs();
  const [drafts, queue, blueprints, audits, approved, rejected, working, tagIndex] = await Promise.all([
    readJsonFiles(dirs.originalDrafts),
    readJsonFiles(dirs.queue),
    readJsonFiles(dirs.blueprints),
    readJsonFiles(dirs.audits),
    readJson(files.approved, []),
    readJson(files.rejected, []),
    readJson(files.working, []),
    readJson(files.tagIndex, {}),
  ]);
  const auditByDraft = mapBy(audits, (audit) => audit.newQuestionId);
  const blueprintBySource = mapBy(blueprints, (blueprint) => blueprint.sourceQuestionId);
  const queueByDraft = mapBy(queue, idFromDraft);
  const workingByDraft = mapBy(working, idFromDraft);
  const approvedIds = new Set(approved.map((item) => item.id || item.newQuestionId));
  const rejectedIds = new Set(rejected.map((item) => item.id || item.newQuestionId));

  const merged = drafts.map((draft) => {
    const queued = queueByDraft.get(idFromDraft(draft)) || {};
    const work = workingByDraft.get(idFromDraft(draft)) || {};
    const item = { ...draft, ...queued, ...work };
    const audit = auditByDraft.get(idFromDraft(item)) || item.audit || null;
    const blueprint = blueprintBySource.get(item.sourceQuestionId) || null;
    const status = approvedIds.has(idFromDraft(item)) ? "approved" : rejectedIds.has(idFromDraft(item)) ? "rejected" : item.reviewStatus || "pending_review";
    const entry = { item, audit, blueprint, status };
    const blockers = fastReviewIssues(entry);
    return {
      ...entry,
      fastReview: {
        ready: blockers.length === 0,
        blockers,
        warningFlags: blockingWarnings(item),
      },
    };
  });
  return { items: merged, approved, rejected, tagIndex };
}

function summaryFromState(state) {
  const total = state.items.length;
  const approved = state.approved.length;
  const rejected = state.rejected.length;
  const pending = state.items.filter((entry) => entry.status !== "approved" && entry.status !== "rejected").length;
  const riskCount = (label) => state.items.filter((entry) => entry.audit?.primaryRiskLabel === label || entry.audit?.riskLabels?.includes(label)).length;
  const needsTagReview = state.items.filter((entry) => entry.item.reviewStatus === "needs_tag_review" || entry.item.tagReviewStatus === "needs_tag_review").length;
  const readyForFastReview = state.items.filter((entry) => entry.fastReview?.ready).length;
  return {
    totalDraftQuestions: total,
    pendingReview: pending,
    lowSimilarityRisk: riskCount("low_similarity_risk"),
    mediumSimilarityRisk: riskCount("medium_similarity_risk"),
    highSimilarityRisk: riskCount("high_similarity_risk"),
    clinicalReviewRequired: riskCount("clinical_review_required"),
    needsTagReview,
    readyForFastReview,
    approvedCount: approved,
    rejectedCount: rejected,
  };
}

async function appendEvent(event) {
  const events = await readJson(files.events, []);
  events.push({ ...event, at: new Date().toISOString() });
  await writeJson(files.events, events);
}

function safeFilePart(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "unknown";
}

function normalizeExternalSubmissionPayload(body = {}) {
  if (body.schemaVersion === "external-review-batch.v1") {
    const submissions = Array.isArray(body.submissions) ? body.submissions : [];
    if (!submissions.length) throw new Error("Batch contains no review submissions.");
    return { batch: body, submissions };
  }
  if (body.schemaVersion === "external-review-submission.v1" || body.questionId || body.response) {
    return { batch: null, submissions: [body] };
  }
  throw new Error("Unsupported external review payload.");
}

async function appendExternalSubmissionLog(record) {
  await fs.mkdir(path.dirname(files.externalSubmissionLog), { recursive: true });
  await fs.appendFile(files.externalSubmissionLog, `${JSON.stringify(record)}\n`, "utf8");
}

async function saveExternalReviewSubmission(body = {}) {
  const { batch, submissions } = normalizeExternalSubmissionPayload(body);
  const now = new Date().toISOString();
  const saved = [];
  await fs.mkdir(dirs.externalSubmissions, { recursive: true });
  for (const submission of submissions) {
    const reviewer = submission.reviewer || batch?.reviewer || {};
    const questionId = submission.questionId || submission.itemSnapshot?.id || "unknown";
    const record = {
      ...submission,
      receivedAt: now,
      source: "external_reviewer_public_form",
    };
    const fileName = `${now.replace(/[:.]/g, "-")}_${safeFilePart(reviewer.key || reviewer.name)}_${safeFilePart(questionId)}.json`;
    const filePath = path.join(dirs.externalSubmissions, fileName);
    await writeJson(filePath, record);
    await appendExternalSubmissionLog({ receivedAt: now, reviewer: reviewer.key || reviewer.name || "unknown", questionId, decision: submission.decision || "", file: filePath });
    saved.push({ questionId, reviewer: reviewer.key || reviewer.name || "unknown", file: filePath });
  }
  await appendEvent({ type: "external_review_submitted", count: saved.length, reviewer: batch?.reviewer?.key || saved[0]?.reviewer || "unknown", saved });
  return { ok: true, savedCount: saved.length, saved };
}

async function upsertWorking(item) {
  const working = await readJson(files.working, []);
  const id = idFromDraft(item);
  const next = working.filter((entry) => idFromDraft(entry) !== id);
  next.push(item);
  await writeJson(files.working, next);
}

const REWRITE_FIELD_MAP = {
  stem: "newStem",
  rationale: "newRationale",
  choices: "newAnswerChoices",
  distractors: "newAnswerChoices",
  whyWrong: "whyWrong",
  difficulty: "difficulty",
  estimatedTimeSeconds: "estimatedTimeSeconds",
  tagging: "tagging",
};

function canonicalRewriteField(field) {
  if (field === "choices") return "distractors";
  return field;
}

function validateApplyRewriteBody(body = {}) {
  const issues = [];
  const allowed = new Set((body.allowedRewriteFields || []).map(canonicalRewriteField));
  const rewritten = body.rewrittenFields || {};
  if (!body.reviewerName?.trim()) issues.push("reviewerName is required.");
  if (!body.reviewerNote?.trim()) issues.push("reviewerNote is required before applying a rewrite.");
  if (!body.sourceSafetyStatement?.trim()) issues.push("sourceSafetyStatement is required before applying a rewrite.");
  if (!Object.keys(rewritten).length) issues.push("No rewrittenFields were provided.");
  for (const field of Object.keys(rewritten)) {
    const canonical = canonicalRewriteField(field);
    if (!allowed.has(canonical)) issues.push(`Field ${field} is not in allowedRewriteFields.`);
    if (!REWRITE_FIELD_MAP[canonical] && !REWRITE_FIELD_MAP[field]) issues.push(`Field ${field} is not supported for rewrite application.`);
  }
  for (const locked of body.lockedFields || []) {
    if (Object.prototype.hasOwnProperty.call(rewritten, locked)) issues.push(`Locked field ${locked} cannot be rewritten.`);
  }
  return issues;
}

function applyRewriteToItem(item, body = {}) {
  const rewritten = body.rewrittenFields || {};
  const next = { ...item };
  for (const [field, value] of Object.entries(rewritten)) {
    const canonical = canonicalRewriteField(field);
    const itemField = REWRITE_FIELD_MAP[canonical] || REWRITE_FIELD_MAP[field];
    next[itemField] = value;
  }
  const now = new Date().toISOString();
  next.reviewStatus = "needs_human_review";
  next.modelAssistedRewrite = {
    appliedAt: now,
    appliedBy: body.reviewerName,
    reviewerNote: body.reviewerNote,
    sourceSafetyStatement: body.sourceSafetyStatement,
    changeSummary: body.changeSummary || [],
    reviewerWarnings: body.reviewerWarnings || [],
    allowedRewriteFields: body.allowedRewriteFields || [],
    lockedFields: body.lockedFields || [],
    rewrittenFieldNames: Object.keys(rewritten),
  };
  next.updatedAt = now;
  return next;
}

async function applyRewriteItem(id, body) {
  const state = await loadState();
  const entry = state.items.find((candidate) => idFromDraft(candidate.item) === id);
  if (!entry) return { status: 404, body: { error: "Item not found" } };
  const issues = validateApplyRewriteBody(body);
  if (issues.length) return { status: 400, body: { error: "Rewrite apply blocked", issues } };
  const item = applyRewriteToItem(entry.item, body);
  const integrity = validateQuestionIntegrity(item);
  if (!integrity.passed) {
    return {
      status: 400,
      body: {
        error: "Question integrity failed",
        code: "QUESTION_INTEGRITY_FAILED",
        issues: integrity.issues,
        integrityIssues: integrity.integrityIssues,
      },
    };
  }
  await upsertWorking(item);
  await appendEvent({
    type: "rewrite_applied",
    id,
    reviewerName: body.reviewerName || "",
    reviewerNote: body.reviewerNote || "",
    rewrittenFieldNames: Object.keys(body.rewrittenFields || {}),
  });
  return { body: { ok: true, item } };
}

async function approveItem(id, body) {
  const state = await loadState();
  const entry = state.items.find((candidate) => idFromDraft(candidate.item) === id);
  if (!entry) return { status: 404, body: { error: "Item not found" } };
  const item = { ...entry.item, ...(body.item || {}) };
  const meta = body.meta || {};
  const issues = approvalIssues(item, entry.audit, meta);
  if (issues.length) return { status: 400, body: { error: "Approval blocked", issues } };

  const approvedQuestion = normalizeApprovedQuestion(item, {
    ...meta,
    sourceBlueprintId: entry.blueprint?.sourceQuestionId || item.sourceQuestionId,
    similarityAuditId: sourceIdFromAudit(entry.audit || {}),
  });
  const approved = (await readJson(files.approved, [])).filter((existing) => existing.id !== approvedQuestion.id);
  approved.push(approvedQuestion);
  await writeJson(files.approved, approved);
  await appendEvent({ type: "approved", id, approvedBy: meta.approvedBy || "", reviewNotes: meta.reviewNotes || "" });
  return { body: { ok: true, approvedQuestion } };
}

async function batchApproveItems(body) {
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter(Boolean))] : [];
  if (!ids.length) return { status: 400, body: { error: "No item IDs were provided." } };
  if (ids.length > 50) return { status: 400, body: { error: "Batch approval is limited to 50 items." } };

  const meta = {
    approvedBy: body.reviewerName || body.approvedBy || "",
    reviewNotes: body.batchReviewNote || body.reviewNotes || "",
    clinicalReviewStatus: body.clinicalReviewStatus,
    tagReviewStatus: body.tagReviewStatus,
    contentVersion: body.contentVersion || "1.0.0",
  };
  if (!meta.approvedBy.trim()) return { status: 400, body: { error: "Reviewer name is required." } };
  if (!meta.reviewNotes.trim()) return { status: 400, body: { error: "Batch review note is required." } };
  if (meta.clinicalReviewStatus !== "reviewed_passed") return { status: 400, body: { error: "clinicalReviewStatus must be reviewed_passed." } };
  if (meta.tagReviewStatus !== "reviewed_passed") return { status: 400, body: { error: "tagReviewStatus must be reviewed_passed." } };

  const state = await loadState();
  const byId = new Map(state.items.map((entry) => [idFromDraft(entry.item), entry]));
  const approved = await readJson(files.approved, []);
  const approvedIds = new Set(approved.map((item) => item.id || item.newQuestionId));
  const beforeCount = approved.length;
  const nextApproved = [...approved];
  const skipped = [];
  const approvedIdsThisBatch = [];

  for (const id of ids) {
    const entry = byId.get(id);
    if (!entry) {
      skipped.push({ id, reasons: ["Item not found."] });
      continue;
    }
    if (approvedIds.has(id)) {
      skipped.push({ id, reasons: ["Duplicate approved question ID."] });
      continue;
    }
    const issues = fastReviewIssues(entry);
    if (issues.length) {
      skipped.push({ id, reasons: issues });
      continue;
    }

    const approvedQuestion = normalizeApprovedQuestion(entry.item, {
      ...meta,
      sourceBlueprintId: entry.blueprint?.sourceQuestionId || entry.item.sourceQuestionId,
      similarityAuditId: sourceIdFromAudit(entry.audit || {}),
    });
    nextApproved.push(approvedQuestion);
    approvedIds.add(id);
    approvedIdsThisBatch.push(id);
  }

  if (approvedIdsThisBatch.length) await writeJson(files.approved, nextApproved);
  await appendEvent({
    type: "batch_approved",
    approvedBy: meta.approvedBy,
    reviewNotes: meta.reviewNotes,
    requestedCount: ids.length,
    approvedCount: approvedIdsThisBatch.length,
    skipped,
  });

  return {
    body: {
      ok: true,
      beforeCount,
      afterCount: nextApproved.length,
      approvedCount: approvedIdsThisBatch.length,
      approvedIds: approvedIdsThisBatch,
      skippedCount: skipped.length,
      skipped,
    },
  };
}

async function rejectItem(id, body) {
  const state = await loadState();
  const entry = state.items.find((candidate) => idFromDraft(candidate.item) === id);
  if (!entry) return { status: 404, body: { error: "Item not found" } };
  const rejectedItem = {
    ...entry.item,
    rejection: {
      rejectedBy: body.rejectedBy || "",
      rejectedAt: new Date().toISOString(),
      rejectionReason: body.rejectionReason || "",
      reviewerNote: body.reviewerNote || "",
    },
    sourceBlueprintId: entry.blueprint?.sourceQuestionId || entry.item.sourceQuestionId,
    similarityAuditId: sourceIdFromAudit(entry.audit || {}),
  };
  const rejected = (await readJson(files.rejected, [])).filter((existing) => idFromDraft(existing) !== id);
  rejected.push(rejectedItem);
  await writeJson(files.rejected, rejected);
  await appendEvent({ type: "rejected", id, rejectionReason: body.rejectionReason || "", reviewerNote: body.reviewerNote || "" });
  return { body: { ok: true, rejectedItem } };
}

async function handleRequest(req, res) {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, ngrok-skip-browser-warning");
  if (req.method === "OPTIONS") return res.end();

  try {
    let body = {};
    if (req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    }

    if (req.method === "GET" && url.pathname === "/api/review/state") {
      const state = await loadState();
      return json(res, { summary: summaryFromState(state), items: state.items, tagIndex: state.tagIndex });
    }
    if (req.method === "GET" && url.pathname === "/") {
      return json(res, {
        ok: true,
        service: "NCLEX Review API",
        availableRoutes: [
          "GET /",
          "GET /health",
          "GET /api/review/state",
          "POST /api/review/save",
          "POST /api/external-reviews",
          "POST /api/review/batch-approve",
          "POST /api/review/items/:id/approve",
          "POST /api/review/items/:id/reject",
          "POST /api/review/items/:id/rewrite",
          "POST /api/review/items/:id/apply-rewrite",
        ],
      });
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/review/save") {
      const integrity = validateQuestionIntegrity(body.item || {});
      if (!integrity.passed) {
        return json(res, {
          error: "Question integrity failed",
          code: "QUESTION_INTEGRITY_FAILED",
          issues: integrity.issues,
          integrityIssues: integrity.integrityIssues,
        }, 400);
      }
      await upsertWorking(body.item);
      await appendEvent({ type: "saved", id: idFromDraft(body.item), reviewerNote: body.reviewerNote || "" });
      return json(res, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/external-reviews") {
      const saved = await saveExternalReviewSubmission(body);
      return json(res, saved);
    }
    if (req.method === "POST" && url.pathname === "/api/review/batch-approve") {
      const result = await batchApproveItems(body);
      return json(res, result.body, result.status || 200);
    }
    const approveMatch = url.pathname.match(/^\/api\/review\/items\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      const result = await approveItem(decodeURIComponent(approveMatch[1]), body);
      return json(res, result.body, result.status || 200);
    }
    const rejectMatch = url.pathname.match(/^\/api\/review\/items\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) {
      const result = await rejectItem(decodeURIComponent(rejectMatch[1]), body);
      return json(res, result.body, result.status || 200);
    }
    const applyRewriteMatch = url.pathname.match(/^\/api\/review\/items\/([^/]+)\/apply-rewrite$/);
    if (req.method === "POST" && applyRewriteMatch) {
      const result = await applyRewriteItem(decodeURIComponent(applyRewriteMatch[1]), body);
      return json(res, result.body, result.status || 200);
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/review\/items\/([^/]+)\/rewrite$/)) {
      const id = decodeURIComponent(url.pathname.match(/^\/api\/review\/items\/([^/]+)\/rewrite$/)[1]);
      await appendEvent({ type: "rewrite_requested", id, reviewerNote: body.reviewerNote || "" });
      return json(res, { ok: true });
    }
    return json(res, { error: "Not found" }, 404);
  } catch (error) {
    return json(res, { error: error.message }, 500);
  }
}

function json(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export { validateQuestionIntegrity, choicesFromItem };

// Only start listening when run directly (node server/reviewApi.mjs), so tests
// can import the validator without booting an HTTP server.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env.REVIEW_API_PORT || 5174);
  http.createServer(handleRequest).listen(port, "127.0.0.1", () => {
    console.log(`Review API listening on http://127.0.0.1:${port}`);
  });
}
