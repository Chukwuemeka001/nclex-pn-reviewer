import assert from "node:assert/strict";
import { test } from "node:test";
import { assessSingleAnswerPositionBalance, validateQuestionIntegrity } from "./questionIntegrity.js";

test("validateQuestionIntegrity catches keyed/text mismatch", () => {
  const item = {
    id: "x",
    answerChoices: ["A", "B", "C", "D"],
    correctAnswerIndexes: [1],
    correctAnswerText: ["A"],
  };
  const res = validateQuestionIntegrity(item);
  assert.equal(res.passed, false);
  assert.ok(res.errors.some((e) => e.includes("correctAnswerText")));
});

test("validateQuestionIntegrity accepts canonical keyed/text pair", () => {
  const item = {
    id: "x",
    answerChoices: ["A", "B", "C", "D"],
    correctAnswerIndexes: [2],
    correctAnswerText: ["C"],
    whyWrong: ["bad", "bad", "", "bad"],
  };
  const res = validateQuestionIntegrity(item);
  assert.equal(res.passed, true);
  assert.deepEqual(res.normalized.correctAnswerText, ["C"]);
});

test("assessSingleAnswerPositionBalance flags over-concentration", () => {
  const items = [
    { correctAnswerIndexes: [0] },
    { correctAnswerIndexes: [0] },
    { correctAnswerIndexes: [0] },
    { correctAnswerIndexes: [0] },
    { correctAnswerIndexes: [1] },
    { correctAnswerIndexes: [2] },
  ];
  const res = assessSingleAnswerPositionBalance(items, { maxShare: 0.5, minDistinct: 3 });
  assert.equal(res.passed, false);
});
