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

test("requireWhyWrong rejects empty whyWrong", () => {
  const res = validateQuestionIntegrity(
    { answerChoices: ["A", "B", "C"], correctAnswerIndexes: [0], whyWrong: [] },
    { requireWhyWrong: true },
  );
  assert.equal(res.passed, false);
  assert.ok(res.errors.some((e) => /whyWrong is required/.test(e)));
});

test("requireWhyWrong rejects a blank wrong-option entry and a non-blank correct entry", () => {
  const res = validateQuestionIntegrity(
    { answerChoices: ["A", "B", "C"], correctAnswerIndexes: [0], whyWrong: ["should be blank", "why B is wrong", ""] },
    { requireWhyWrong: true },
  );
  assert.equal(res.passed, false);
  assert.ok(res.errors.some((e) => /must be blank at a correct answer index/.test(e)));
  assert.ok(res.errors.some((e) => /must explain why this wrong option is wrong/.test(e)));
});

test("requireWhyWrong accepts blank-at-correct, filled-at-wrong (SATA)", () => {
  const res = validateQuestionIntegrity(
    {
      answerChoices: ["A", "B", "C", "D"],
      correctAnswerIndexes: [0, 2],
      whyWrong: ["", "why B is wrong", "", "why D is wrong"],
    },
    { requireWhyWrong: true },
  );
  assert.equal(res.passed, true, res.errors.join("; "));
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
