import test from "node:test";
import assert from "node:assert/strict";
import { rebalanceAnswerKeys } from "./answerKeyRebalance.js";
import { assessSingleAnswerPositionBalance } from "./questionIntegrity.js";

function makeSingle(id, correctIdx) {
  return {
    id,
    itemType: "multiple_choice",
    stem: `Q ${id}`,
    answerChoices: ["A", "B", "C", "D"],
    correctAnswerIndexes: [correctIdx],
    correctAnswerText: [["A", "B", "C", "D"][correctIdx]],
    rationale: "Because clinical priority.",
    whyWrong: correctIdx === 0 ? ["", "w1", "w2", "w3"] : correctIdx === 1 ? ["w0", "", "w2", "w3"] : correctIdx === 2 ? ["w0", "w1", "", "w3"] : ["w0", "w1", "w2", ""],
  };
}

test("rebalance does not mutate input", () => {
  const input = [makeSingle("q1", 1), makeSingle("q2", 1), makeSingle("q3", 1), makeSingle("q4", 1), makeSingle("q5", 0), makeSingle("q6", 2)];
  const baseline = JSON.parse(JSON.stringify(input));
  rebalanceAnswerKeys(input);
  assert.deepEqual(input, baseline);
});

test("rebalance is deterministic", () => {
  const input = Array.from({ length: 20 }, (_, i) => makeSingle(`q${i + 1}`, 1));
  const a = rebalanceAnswerKeys(input);
  const b = rebalanceAnswerKeys(input);
  assert.deepEqual(a, b);
});

test("rebalance flattens positional skew below maxShare", () => {
  const input = Array.from({ length: 21 }, (_, i) => makeSingle(`q${i + 1}`, 1)).concat([
    makeSingle("q22", 0),
    makeSingle("q23", 2),
    makeSingle("q24", 3),
    makeSingle("q25", 1),
  ]);
  const output = rebalanceAnswerKeys(input, { maxShare: 0.4, minDistinct: 3 });
  const balance = assessSingleAnswerPositionBalance(output, { maxShare: 0.4, minDistinct: 3 });
  assert.equal(balance.passed, true);
});

test("rebalance leaves multi-answer items untouched", () => {
  const multi = {
    id: "sata1",
    itemType: "select_all_that_apply",
    answerChoices: ["A", "B", "C", "D"],
    correctAnswerIndexes: [0, 2],
    correctAnswerText: ["A", "C"],
    rationale: "SATA rationale",
    whyWrong: ["", "w1", "", "w3"],
  };
  const input = [makeSingle("q1", 1), makeSingle("q2", 1), makeSingle("q3", 1), makeSingle("q4", 1), makeSingle("q5", 0), makeSingle("q6", 2), multi];
  const output = rebalanceAnswerKeys(input);
  assert.deepEqual(output[6], multi);
});

test("rebalance keeps whyWrong blank at the new correct index", () => {
  const input = Array.from({ length: 12 }, (_, i) => makeSingle(`q${i + 1}`, 1));
  const output = rebalanceAnswerKeys(input);
  for (const item of output) {
    const idx = item.correctAnswerIndexes[0];
    assert.equal(item.correctAnswerText[0], item.answerChoices[idx]);
    assert.equal(String(item.whyWrong[idx] ?? "").trim(), "");
  }
});
