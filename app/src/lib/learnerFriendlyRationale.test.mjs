import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessLearnerFriendlyRationale,
  buildLearnerFriendlyRewritePrompt,
  learnerFriendlyChecklist,
} from "./learnerFriendlyRationale.js";

test("flags jargon and missing whyWrong", () => {
  const result = assessLearnerFriendlyRationale({
    rationale: "This intervention mitigates pathophysiological decompensation via hemodynamic stabilization.",
    whyWrong: [],
  });
  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.includes("plain nursing language")));
  assert.ok(result.issues.some((issue) => issue.includes("why the wrong answers")));
});

test("accepts a clear teaching rationale", () => {
  const result = assessLearnerFriendlyRationale({
    rationale: "First keep the client safe. The call bell helps the client ask for help before getting up, which lowers fall risk.",
    whyWrong: ["Raising the bed increases fall risk.", "Removing non-skid socks makes slipping more likely."],
  });
  assert.equal(result.passed, true);
  assert.equal(result.score >= 3, true);
});

test("checklist uses easy nursing teaching language", () => {
  const checklist = learnerFriendlyChecklist();
  assert.ok(checklist.some((item) => item.includes("what the nurse should notice")));
  assert.ok(checklist.some((item) => item.includes("why each wrong answer is less safe")));
});

test("rewrite prompt preserves clinical facts and asks for plain language", () => {
  const prompt = buildLearnerFriendlyRewritePrompt({
    stem: "A PN cares for a client at risk for falls. What is priority?",
    rationale: "Keep call bell near client.",
    whyWrong: ["Bed raised is unsafe."],
  });
  assert.ok(prompt.includes("easy nursing language"));
  assert.ok(prompt.includes("Do not change the answer key"));
  assert.ok(prompt.includes("JSON"));
});

test("flags generic rationale without option-specific whyWrong", () => {
  const result = assessLearnerFriendlyRationale({
    rationale: "This is correct because it is in PN scope and the other options are not the best answer.",
    whyWrong: ["Not the best answer.", "Not the best answer.", "Not the best answer."],
  });
  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.includes("specific to that option")));
});
