import assert from "node:assert/strict";
import { test } from "node:test";
import { validateQuestionIntegrity } from "./reviewApi.mjs";

// C3: the server no longer owns a private integrity implementation; it delegates
// to ../src/lib/questionIntegrity.js. These tests lock in that the adapter keeps
// the server's field precedence and response contract.

test("flags keyed/text mismatch with the lib's message", () => {
  const res = validateQuestionIntegrity({
    answerChoices: ["A", "B", "C", "D"],
    correctAnswerIndexes: [1],
    correctAnswerText: ["A"],
  });
  assert.equal(res.passed, false);
  assert.ok(res.issues.some((m) => m.includes("correctAnswerText")), `issues=${JSON.stringify(res.issues)}`);
  assert.ok(res.integrityIssues.every((i) => i.code === "QUESTION_INTEGRITY" && typeof i.message === "string"));
});

test("accepts a canonical keyed/text pair", () => {
  const res = validateQuestionIntegrity({
    answerChoices: ["A", "B", "C", "D"],
    correctAnswerIndexes: [2],
    correctAnswerText: ["C"],
  });
  assert.equal(res.passed, true);
  assert.deepEqual(res.issues, []);
});

test("validates rewritten drafts against newAnswerChoices, not the stale originals", () => {
  // A rewritten draft carries both: server precedence must validate the new set.
  const res = validateQuestionIntegrity({
    answerChoices: ["old-A", "old-B"],
    newAnswerChoices: ["new-A", "new-B", "new-C"],
    correctAnswerIndexes: [2],
    correctAnswerText: ["new-C"],
  });
  assert.equal(res.passed, true, `issues=${JSON.stringify(res.issues)}`);
});

test("flags an out-of-range index", () => {
  const res = validateQuestionIntegrity({
    answerChoices: ["A", "B"],
    correctAnswerIndexes: [5],
  });
  assert.equal(res.passed, false);
  assert.ok(res.issues.some((m) => /out-of-range/.test(m)));
});
