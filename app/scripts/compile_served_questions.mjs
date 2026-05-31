#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQuestionIntegrity, assessSingleAnswerPositionBalance } from "../src/lib/questionIntegrity.js";
import { assessDistractorPlausibility } from "../src/lib/distractorQuality.js";
import { assessLearnerFriendlyRationale } from "../src/lib/learnerFriendlyRationale.js";
import { rebalanceAnswerKeys } from "../src/lib/answerKeyRebalance.js";
import { buildBlueprintRef, PLAN_VERSION } from "../src/lib/blueprint.js";
import { deriveQuestionFamilyKey } from "../src/lib/familyKey.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");

const sourceFile = path.join(appRoot, "src/data/external_review_first10.json");
const outFile = path.join(appRoot, "src/data/served_questions.json");

const SERVEABLE_STATUSES = new Set(["approved_alpha", "candidate_approved_alpha"]);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, value) {
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeForServe(item) {
  const answerChoices = item.answerChoices || item.choices || [];
  const correctAnswerIndexes = Array.isArray(item.correctAnswerIndexes) ? item.correctAnswerIndexes : [];
  const correctAnswerText = Array.isArray(item.correctAnswerText)
    ? item.correctAnswerText
    : correctAnswerIndexes.map((idx) => answerChoices[idx]).filter(Boolean);

  return {
    ...item,
    itemType: item.itemType || "multiple_choice",
    answerChoices,
    correctAnswerIndexes,
    correctAnswerText,
    whyWrong: Array.isArray(item.whyWrong) ? item.whyWrong : [],
  };
}

const allItems = readJson(sourceFile);
const eligible = allItems.filter((item) => SERVEABLE_STATUSES.has(item.reviewStatus));

const dropped = [];
const passed = [];

for (const raw of eligible) {
  const item = normalizeForServe(raw);

  const integrity = validateQuestionIntegrity(item, { strictItemType: false, requireWhyWrong: true });
  if (!integrity.passed) {
    dropped.push({ id: item.id || "unknown", reason: `integrity: ${integrity.errors.join("; ")}` });
    continue;
  }

  const distractor = assessDistractorPlausibility({
    stem: item.stem,
    choices: item.answerChoices,
    correctAnswerIndexes: item.correctAnswerIndexes,
  });
  if (!distractor.passed) {
    dropped.push({ id: item.id || "unknown", reason: `distractor: ${distractor.issues.join("; ")}` });
    continue;
  }

  const rationale = assessLearnerFriendlyRationale({
    rationale: item.rationale,
    whyWrong: item.whyWrong,
    answerChoices: item.answerChoices,
    correctAnswerIndexes: item.correctAnswerIndexes,
  });
  if (!rationale.passed) {
    dropped.push({ id: item.id || "unknown", reason: `rationale: ${rationale.issues.join("; ")}` });
    continue;
  }

  const blueprintRef = buildBlueprintRef(item.tags || {});
  if (!blueprintRef.valid) {
    dropped.push({ id: item.id || "unknown", reason: `blueprint: ${blueprintRef.issues.join("; ")}` });
    continue;
  }
  item.blueprintRef = blueprintRef;
  item.familyKey = deriveQuestionFamilyKey(item);

  passed.push(item);
}

let rebalanced = [];
if (passed.length) {
  rebalanced = rebalanceAnswerKeys(passed, { maxShare: 0.4, minDistinct: 3 });
  const balance = assessSingleAnswerPositionBalance(rebalanced, { maxShare: 0.4, minDistinct: 3 });
  if (!balance.passed) {
    throw new Error(`Answer-key rebalance failed: ${balance.issues.join("; ")}`);
  }
}

const coverage = {};
for (const q of rebalanced) {
  const cn = q.blueprintRef?.clientNeeds || "(none)";
  coverage[cn] = (coverage[cn] || 0) + 1;
}

const artifact = {
  schemaVersion: "served-questions.v1",
  planVersion: PLAN_VERSION,
  compiledAt: new Date().toISOString(),
  sourceFile: "app/src/data/external_review_first10.json",
  gateVersions: {
    integrity: "requireWhyWrong:true,strictItemType:false",
    distractor: "CARTOON_UNSAFE_PATTERNS",
    rationale: "learnerFriendly>=3,issues<=1",
  },
  counts: {
    eligible: eligible.length,
    passed: rebalanced.length,
    dropped: dropped.length,
  },
  coverage,
  dropped,
  questions: rebalanced,
};

writeJson(outFile, artifact);

console.log("[compile_served_questions] done");
console.log(`eligible=${artifact.counts.eligible} passed=${artifact.counts.passed} dropped=${artifact.counts.dropped}`);
if (dropped.length) {
  console.log(`[compile_served_questions] dropped ids: ${dropped.map((d) => d.id).join(", ")}`);
}
