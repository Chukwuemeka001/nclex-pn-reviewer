import assert from "node:assert/strict";
import { test } from "node:test";
import { assessDistractorPlausibility } from "./distractorQuality.js";

test("flags a cartoonishly-unsafe order-violation distractor", () => {
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
});

test("accepts plausible-but-incorrect nursing distractors", () => {
  const result = assessDistractorPlausibility({
    stem: "The client reports constipation after surgery. Which action should the PN take first?",
    choices: [
      "Assess bowel sounds, pain, diet, fluid intake, mobility, and last bowel movement.",
      "Assess bowel pattern and recent fluid intake before selecting a non-pharmacologic intervention.",
      "Offer privacy and time on the commode if safe to transfer.",
      "Review whether prescribed stool softeners are due.",
    ],
    correctAnswerIndexes: [0],
  });

  assert.equal(result.passed, true);
  assert.equal(result.flaggedChoices.length, 0);
});

test("does not flag correct emergency actions", () => {
  const result = assessDistractorPlausibility({
    stem: "The client is pulseless. What should the nurse do first?",
    choices: ["Start CPR.", "Give water.", "Document the finding.", "Call dietary."],
    correctAnswerIndexes: [0],
  });

  assert.equal(result.flaggedChoices.some((choice) => choice.choice === "Start CPR."), false);
});

test("flags correct-answer giveaway from stem wording", () => {
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
});

// C7: expanded pattern coverage — these evasions previously slipped through.
test("flags expanded cartoonish-unsafe evasions", () => {
  const cases = [
    "Reuse the same needle for the next injection.",
    "Recap the used needle by hand.",
    "Double the dose of insulin on your own.",
    "Stop the prescribed antibiotic without telling the provider.",
    "Tell the client to stop taking the medication.",
    "Provide care without washing your hands.",
    "Skip the assessment and document the task as done.",
    "Leave the client unattended on the commode.",
  ];
  for (const unsafe of cases) {
    const result = assessDistractorPlausibility({
      stem: "Which action by the PN requires follow-up?",
      choices: ["Perform hand hygiene and verify the order before giving care.", unsafe, "Reassess the client.", "Notify the charge nurse."],
      correctAnswerIndexes: [0],
    });
    assert.ok(
      result.flaggedChoices.some((choice) => choice.choice === unsafe),
      `expected to flag: ${unsafe}`,
    );
  }
});

test("does not flag legitimate ordered/scope-appropriate actions", () => {
  const result = assessDistractorPlausibility({
    stem: "The PN is caring for a client with a new prescription. Which actions are appropriate?",
    choices: [
      "Administer the prescribed antibiotic after checking the order and allergies.",
      "Administer the prescribed antibiotic after checking compatibility and infusion timing.",
      "Encourage fluids within the prescribed plan.",
      "Reassess pain after the intervention.",
    ],
    correctAnswerIndexes: [0],
  });
  assert.equal(result.flaggedChoices.length, 0, `unexpected flags: ${JSON.stringify(result.flaggedChoices)}`);
});

test("flags when no near-miss distractor exists", () => {
  const result = assessDistractorPlausibility({
    stem: "A dizzy client is unsteady. Which action is safest first?",
    choices: [
      "Have the client sit and call for help before walking.",
      "Serve lunch immediately.",
      "Open window blinds.",
      "Discuss next week's follow-up visit.",
    ],
    correctAnswerIndexes: [0],
  });
  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.includes("near-miss")));
});
