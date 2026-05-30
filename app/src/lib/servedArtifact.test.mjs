import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQuestionIntegrity, assessSingleAnswerPositionBalance } from "./questionIntegrity.js";
import { assessDistractorPlausibility } from "./distractorQuality.js";
import { assessLearnerFriendlyRationale } from "./learnerFriendlyRationale.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const artifact = JSON.parse(fs.readFileSync(path.join(here, "../data/served_questions.json"), "utf8"));
const sourceItems = JSON.parse(fs.readFileSync(path.join(here, "../data/external_review_first10.json"), "utf8"));

test("served artifact exists and has schema", () => {
  assert.equal(artifact.schemaVersion, "served-questions.v1");
  assert.ok(Array.isArray(artifact.questions));
});

test("served artifact is non-empty", () => {
  assert.ok(artifact.questions.length >= 1);
});

test("served items all pass strict integrity", () => {
  for (const item of artifact.questions) {
    const result = validateQuestionIntegrity(item, { strictItemType: false, requireWhyWrong: true });
    assert.equal(result.passed, true, `${item.id}: ${result.errors.join("; ")}`);
  }
});

test("served items all pass distractor and rationale gates", () => {
  for (const item of artifact.questions) {
    const distractor = assessDistractorPlausibility({
      stem: item.stem,
      choices: item.answerChoices,
      correctAnswerIndexes: item.correctAnswerIndexes,
    });
    assert.equal(distractor.passed, true, `${item.id}: ${distractor.issues.join("; ")}`);

    const rationale = assessLearnerFriendlyRationale({
      rationale: item.rationale,
      whyWrong: item.whyWrong,
      answerChoices: item.answerChoices,
      correctAnswerIndexes: item.correctAnswerIndexes,
    });
    assert.equal(rationale.passed, true, `${item.id}: ${rationale.issues.join("; ")}`);
  }
});

test("served artifact only includes reviewed statuses", () => {
  const statusById = new Map(sourceItems.map((x) => [x.id, x.reviewStatus]));
  for (const item of artifact.questions) {
    const status = statusById.get(item.id);
    assert.ok(status === "approved_alpha" || status === "candidate_approved_alpha", `${item.id}: status=${status}`);
  }
});

test("served single-answer distribution satisfies gate", () => {
  const balance = assessSingleAnswerPositionBalance(artifact.questions, { maxShare: 0.4, minDistinct: 3 });
  assert.equal(balance.passed, true, balance.issues.join("; "));
});

test("rebalance preserves key text + whyWrong blank at correct index", () => {
  for (const item of artifact.questions) {
    if (!Array.isArray(item.correctAnswerIndexes) || item.correctAnswerIndexes.length !== 1) continue;
    const idx = item.correctAnswerIndexes[0];
    assert.equal(item.answerChoices[idx], item.correctAnswerText[0], `${item.id}: keyed text mismatch`);
    assert.equal(String(item.whyWrong[idx] ?? "").trim(), "", `${item.id}: whyWrong at key index should be blank`);
  }
});
