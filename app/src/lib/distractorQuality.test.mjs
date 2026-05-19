import assert from "node:assert/strict";
import { assessDistractorPlausibility } from "./distractorQuality.js";

function testFlagsCartoonishlyUnsafeOrderViolationDistractor() {
  const result = assessDistractorPlausibility({
    stem: "The client reports constipation after surgery. Which action should the PN take first?",
    choices: [
      "Encourage fluids as allowed and assess bowel pattern.",
      "Give a laxative without a provider order.",
      "Ask about usual bowel routine.",
      "Encourage ambulation as tolerated.",
    ],
    correctAnswerIndexes: [0],
  });

  assert.equal(result.passed, false);
  assert.ok(result.flaggedChoices.some((choice) => choice.choice.includes("without a provider order")));
  assert.ok(result.issues.some((issue) => issue.includes("too obviously unsafe")));
}

function testAcceptsPlausibleButIncorrectNursingDistractors() {
  const result = assessDistractorPlausibility({
    stem: "The client reports constipation after surgery. Which action should the PN take first?",
    choices: [
      "Assess bowel sounds, pain, diet, fluid intake, mobility, and last bowel movement.",
      "Encourage the client to increase fiber after checking diet tolerance and orders.",
      "Offer privacy and time on the commode if safe to transfer.",
      "Review whether prescribed stool softeners are due.",
    ],
    correctAnswerIndexes: [0],
  });

  assert.equal(result.passed, true);
  assert.equal(result.flaggedChoices.length, 0);
}

function testDoesNotFlagCorrectEmergencyActions() {
  const result = assessDistractorPlausibility({
    stem: "The client is pulseless. What should the nurse do first?",
    choices: ["Start CPR.", "Give water.", "Document the finding.", "Call dietary."],
    correctAnswerIndexes: [0],
  });

  assert.equal(result.flaggedChoices.some((choice) => choice.choice === "Start CPR."), false);
}

function testFlagsCorrectAnswerGiveawayFromStemWording() {
  const result = assessDistractorPlausibility({
    stem: "The PN notices repeated food left untouched on one side of the plate. Which finding should be reported?",
    choices: [
      "Report food repeatedly left untouched on one side of the tray.",
      "Offer the client a different meal tray.",
      "Ask family to bring preferred foods.",
      "Document that appetite is poor.",
    ],
    correctAnswerIndexes: [0],
  });

  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.includes("guessed from wording")));
}

function run() {
  testFlagsCartoonishlyUnsafeOrderViolationDistractor();
  testAcceptsPlausibleButIncorrectNursingDistractors();
  testDoesNotFlagCorrectEmergencyActions();
  testFlagsCorrectAnswerGiveawayFromStemWording();
  console.log("distractorQuality tests passed");
}

run();
