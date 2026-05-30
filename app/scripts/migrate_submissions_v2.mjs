#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapReviewerScores, scoreExternalReview } from "../src/lib/externalReviewerRubric.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "..");

const inputJsonl = path.join(repoRoot, "qbank_pipeline/review_logs/external_review_submissions.jsonl");
const inputDir = path.join(repoRoot, "qbank_pipeline/external_review_submissions");

const outJsonl = path.join(repoRoot, "qbank_pipeline/review_logs/external_review_submissions.v2.jsonl");
const outDir = path.join(repoRoot, "qbank_pipeline/external_review_submissions_v2");
const reportFile = path.join(repoRoot, "qbank_pipeline/review_logs/migration_report.json");

const apply = process.argv.includes("--apply");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
}

function normalizeSubmissionV2(record) {
  if (record?.schemaVersion === "external-review-submission.v2") {
    return { migrated: false, record };
  }

  const response = record.response || {};
  const scoresRaw = response.scores || record.scores || {};

  let scoresCanonical = null;
  let decisionComputed = null;
  let computedScore = null;
  let mappingError = null;

  try {
    if (scoresRaw && Object.keys(scoresRaw).length > 0) {
      scoresCanonical = mapReviewerScores(scoresRaw);
      computedScore = scoreExternalReview(scoresCanonical);
      decisionComputed = computedScore.decision;
    }
  } catch (error) {
    mappingError = error?.message || String(error);
  }

  const decisionManual = record.decision || "";
  const decisionMismatch = Boolean(decisionManual && decisionComputed && decisionManual !== decisionComputed);

  return {
    migrated: true,
    record: {
      ...record,
      schemaVersion: "external-review-submission.v2",
      scoresRaw,
      scoresCanonical,
      computedScore,
      decisionComputed,
      decisionManual,
      decisionMismatch,
      scoreMappingError: mappingError,
      decision: decisionManual || decisionComputed || "",
      response: {
        ...response,
        scores: scoresCanonical || scoresRaw,
      },
    },
    mappingError,
    decisionMismatch,
  };
}

const summary = {
  apply,
  jsonl: { total: 0, migrated: 0, mappingErrors: 0, decisionMismatch: 0 },
  files: { total: 0, migrated: 0, mappingErrors: 0, decisionMismatch: 0 },
};

const jsonlOutLines = [];
if (fs.existsSync(inputJsonl)) {
  const lines = fs.readFileSync(inputJsonl, "utf8").split("\n").map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    summary.jsonl.total += 1;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      jsonlOutLines.push(line);
      continue;
    }
    const norm = normalizeSubmissionV2(parsed);
    if (norm.migrated) summary.jsonl.migrated += 1;
    if (norm.mappingError) summary.jsonl.mappingErrors += 1;
    if (norm.decisionMismatch) summary.jsonl.decisionMismatch += 1;
    jsonlOutLines.push(JSON.stringify(norm.record));
  }
}

const fileOut = [];
for (const p of listJsonFiles(inputDir)) {
  summary.files.total += 1;
  const parsed = readJson(p);
  const norm = normalizeSubmissionV2(parsed);
  if (norm.migrated) summary.files.migrated += 1;
  if (norm.mappingError) summary.files.mappingErrors += 1;
  if (norm.decisionMismatch) summary.files.decisionMismatch += 1;
  fileOut.push({ input: p, record: norm.record });
}

console.log("[migrate_submissions_v2] dry-run summary:");
console.log(JSON.stringify(summary, null, 2));

if (!apply) {
  console.log("[migrate_submissions_v2] no files written (dry-run). Use --apply to write v2 outputs.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(outJsonl), { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outJsonl, `${jsonlOutLines.join("\n")}\n`, "utf8");
for (const { input, record } of fileOut) {
  const name = path.basename(input);
  fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
fs.writeFileSync(reportFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log(`[migrate_submissions_v2] wrote ${outJsonl}`);
console.log(`[migrate_submissions_v2] wrote ${outDir}`);
console.log(`[migrate_submissions_v2] wrote ${reportFile}`);
