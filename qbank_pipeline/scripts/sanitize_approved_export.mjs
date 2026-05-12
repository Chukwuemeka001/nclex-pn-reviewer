import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pipelineRoot = path.resolve(here, "..");

const DEFAULT_INPUT_DIR = path.join(pipelineRoot, "approved_questions");
const DEFAULT_OUTPUT_DIR = path.join(pipelineRoot, "public_question_exports");

const PRIVATE_KEYS = new Set([
  "sourceQuestionId",
  "sourceQuizTitle",
  "sourceSlug",
  "sourceGroup",
  "sourceTracePrivate",
  "sourceUrl",
  "sourceUrls",
  "masterSourceName",
  "masterSourceUrl",
  "audit",
  "similarityAudit",
  "similarityPrecheck",
  "draftWarnings",
  "sourceWarnings",
  "generationStrategy",
  "questionNumber",
]);

const UNSAFE_TEXT_PATTERNS = [
  /alphaslice/i,
  /rise\s*360/i,
  /sourceQuestionId/i,
  /sourceTracePrivate/i,
  /sourceQuizTitle/i,
  /masterSourceUrl/i,
  /masterSourceName/i,
  /source_raw/i,
  /qbank_pipeline\/source_raw/i,
  /https?:\/\//i,
  /www\./i,
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function listJsonFiles(dir) {
  if (!await pathExists(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function normalizeApprovedItems(value, sourceFile) {
  const items = Array.isArray(value)
    ? value
    : Array.isArray(value?.questions)
      ? value.questions
      : Array.isArray(value?.items)
        ? value.items
        : null;
  if (!items) throw new Error(`Approved file must be an array or contain questions/items array: ${sourceFile}`);
  return items.filter((item) => isPlainObject(item));
}

function isPrivateKey(key) {
  return PRIVATE_KEYS.has(key) || /^source/i.test(key) || /audit/i.test(key);
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!isPlainObject(value)) return value;
  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    if (isPrivateKey(key)) continue;
    clean[key] = sanitizeValue(child);
  }
  return clean;
}

function publicIdFor(item, fallbackIndex) {
  const existing = item.id || item.newQuestionId || item.questionId;
  if (existing) {
    return String(existing)
      .replace(/_variant_[a-z]$/i, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return `public-q-${String(fallbackIndex + 1).padStart(4, "0")}`;
}

function normalizeQuestion(item, fallbackIndex) {
  const clean = sanitizeValue(item);
  const id = publicIdFor(clean, fallbackIndex);
  const normalized = {
    id,
    status: clean.status || clean.reviewStatus || clean.review?.status || "reviewed_approved",
    examProgram: clean.examProgram || "NCLEX-PN",
    itemType: clean.itemType,
    stem: clean.stem || clean.newStem,
    choices: clean.choices || clean.newAnswerChoices || [],
    correctAnswerIndexes: clean.correctAnswerIndexes || [],
    correctAnswerText: clean.correctAnswerText || [],
    rationale: clean.rationale || clean.newRationale,
    whyWrong: clean.whyWrong || [],
    tagging: clean.tagging || {},
    difficulty: clean.difficulty || clean.difficultyEstimate || "medium",
    estimatedTimeSeconds: clean.estimatedTimeSeconds || 75,
    review: clean.review || {
      status: clean.reviewStatus || "reviewed_approved",
      clinicalReviewStatus: "reviewed_passed",
      tagReviewStatus: "reviewed_passed",
      copyrightRiskStatus: "low_risk",
    },
    createdAt: clean.createdAt,
    updatedAt: clean.updatedAt || new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) delete normalized[key];
  }
  return normalized;
}

function scanUnsafe(value, trail = "$", hits = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanUnsafe(child, `${trail}[${index}]`, hits));
    return hits;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (PRIVATE_KEYS.has(key) || /^source/i.test(key) || /audit/i.test(key)) {
        hits.push({ path: `${trail}.${key}`, reason: "private-key" });
      }
      scanUnsafe(child, `${trail}.${key}`, hits);
    }
    return hits;
  }
  if (typeof value === "string") {
    for (const pattern of UNSAFE_TEXT_PATTERNS) {
      if (pattern.test(value)) {
        hits.push({ path: trail, reason: `unsafe-text:${pattern}` });
      }
    }
  }
  return hits;
}

function validateQuestion(item, sourceFile) {
  const required = ["id", "status", "examProgram", "itemType", "stem", "choices", "correctAnswerIndexes", "rationale", "tagging", "review"];
  const missing = required.filter((key) => item[key] === undefined || item[key] === null || item[key] === "");
  if (missing.length) {
    throw new Error(`Sanitized question missing required fields from ${sourceFile}: ${missing.join(", ")}`);
  }
  if (!Array.isArray(item.choices) || item.choices.length < 2) throw new Error(`Sanitized question needs at least two choices: ${item.id}`);
  if (!Array.isArray(item.correctAnswerIndexes) || item.correctAnswerIndexes.length === 0) throw new Error(`Sanitized question needs correctAnswerIndexes: ${item.id}`);
  if (item.status !== "reviewed_approved" && item.review?.status !== "reviewed_approved") {
    throw new Error(`Sanitized export only allows reviewed_approved questions: ${item.id}`);
  }
}

export async function sanitizeApprovedExports({ inputDir = DEFAULT_INPUT_DIR, outputDir = DEFAULT_OUTPUT_DIR } = {}) {
  const files = await listJsonFiles(inputDir);
  const exported = [];
  const sourceFiles = [];
  const unsafeHits = [];

  for (const file of files) {
    const rawItems = normalizeApprovedItems(await readJson(file), file);
    const approvedItems = rawItems.filter((item) =>
      item.status === "reviewed_approved" ||
      item.reviewStatus === "reviewed_approved" ||
      item.review?.status === "reviewed_approved"
    );
    if (approvedItems.length === 0) continue;
    sourceFiles.push({ file: path.relative(inputDir, file), approvedCount: approvedItems.length });
    for (const item of approvedItems) {
      const normalized = normalizeQuestion(item, exported.length);
      validateQuestion(normalized, file);
      const hits = scanUnsafe(normalized).map((hit) => ({ id: normalized.id, ...hit }));
      unsafeHits.push(...hits);
      exported.push(normalized);
    }
  }

  if (unsafeHits.length > 0) {
    const preview = unsafeHits.slice(0, 10).map((hit) => `${hit.id} ${hit.path} ${hit.reason}`).join("; ");
    throw new Error(`Unsafe approved-question export blocked. Hits: ${preview}`);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const questionPath = path.join(outputDir, "approved_public_questions.json");
  const manifestPath = path.join(outputDir, "manifest.json");
  const manifest = {
    generatedAt: new Date().toISOString(),
    inputDir,
    outputDir,
    sourceFiles,
    questionsExported: exported.length,
    safety: {
      privateKeysStripped: [...PRIVATE_KEYS].sort(),
      unsafeTextPatterns: UNSAFE_TEXT_PATTERNS.map(String),
      unsafeHits: [],
    },
  };
  await writeJson(questionPath, exported);
  await writeJson(manifestPath, manifest);

  return {
    ok: true,
    outputDir,
    filesScanned: files.length,
    filesWritten: 2,
    questionsExported: exported.length,
    unsafeHits: [],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--input-dir") options.inputDir = path.resolve(args[index + 1]);
    if (args[index] === "--output-dir") options.outputDir = path.resolve(args[index + 1]);
  }
  return sanitizeApprovedExports(options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}
