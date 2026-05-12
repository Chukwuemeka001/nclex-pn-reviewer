import assert from "node:assert/strict";
import {
  assessLearnerFriendlyRationale,
  buildLearnerFriendlyRewritePrompt,
  learnerFriendlyChecklist,
} from "./learnerFriendlyRationale.js";

function testAssessmentFlagsJargonAndNoWhyWrong() {
  const result = assessLearnerFriendlyRationale({
    rationale: "This intervention mitigates pathophysiological decompensation via hemodynamic stabilization.",
    whyWrong: [],
  });
  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.includes("plain nursing language")));
  assert.ok(result.issues.some((issue) => issue.includes("why the wrong answers")));
}

function testAssessmentAcceptsClearTeachingRationale() {
  const result = assessLearnerFriendlyRationale({
    rationale: "First keep the client safe. The call bell helps the client ask for help before getting up, which lowers fall risk.",
    whyWrong: ["Raising the bed increases fall risk.", "Removing non-skid socks makes slipping more likely."],
  });
  assert.equal(result.passed, true);
  assert.equal(result.score >= 3, true);
}

function testChecklistUsesEasyNursingTeachingLanguage() {
  const checklist = learnerFriendlyChecklist();
  assert.ok(checklist.some((item) => item.includes("what the nurse should notice")));
  assert.ok(checklist.some((item) => item.includes("why each wrong answer is less safe")));
}

function testRewritePromptPreservesClinicalFactsAndAsksForPlainLanguage() {
  const prompt = buildLearnerFriendlyRewritePrompt({
    stem: "A PN cares for a client at risk for falls. What is priority?",
    rationale: "Keep call bell near client.",
    whyWrong: ["Bed raised is unsafe."],
  });
  assert.ok(prompt.includes("easy nursing language"));
  assert.ok(prompt.includes("Do not change the answer key"));
  assert.ok(prompt.includes("JSON"));
}

function run() {
  testAssessmentFlagsJargonAndNoWhyWrong();
  testAssessmentAcceptsClearTeachingRationale();
  testChecklistUsesEasyNursingTeachingLanguage();
  testRewritePromptPreservesClinicalFactsAndAsksForPlainLanguage();
  console.log("learnerFriendlyRationale tests passed");
}

run();
