import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { assessLearnerFriendlyRationale } from "./learnerFriendlyRationale.js";
import { assessDistractorPlausibility } from "./distractorQuality.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const first10 = JSON.parse(readFileSync(join(__dirname, "../data/external_review_first10.json"), "utf8"));
const byId = new Map(first10.map((item) => [item.id, item]));

const approvedAlphaIds = [
  "assistive_devices_first20_q001_variant_c",
  "assistive_devices_first20_q002_variant_c",
  "assistive_devices_first20_q003_variant_c",
];

function getItem(id) {
  const item = byId.get(id);
  assert.ok(item, `Expected ${id} to exist in first-10 review data`);
  return item;
}

test("approved alpha answer positions are not all the same", () => {
  const keyedPositions = approvedAlphaIds.map((id) => getItem(id).correctAnswerIndexes[0]);
  assert.ok(new Set(keyedPositions).size >= 2, `Alpha answers should not all sit at ${keyedPositions[0]}`);
});

test("q001_variant_a correctAnswerText matches the keyed option, not the stem clue", () => {
  const item = getItem("assistive_devices_first20_q001_variant_a");
  assert.deepEqual(item.correctAnswerIndexes, [0]);
  assert.deepEqual(item.correctAnswerText, [item.answerChoices[0]]);
});

test("approved alpha items carry specific why-wrong teaching and pass existing guards", () => {
  for (const id of approvedAlphaIds) {
    const item = getItem(id);
    assert.equal(item.reviewStatus, "candidate_approved_alpha");
    assert.equal(item.alphaSlice, true);
    assert.equal(item.whyWrong.length, item.answerChoices.length);
    const repeated = item.whyWrong.filter(Boolean).filter((why) => /This option is unsafe or incomplete/.test(why));
    assert.equal(repeated.length, 0, `${id} still has repeated generic whyWrong copy`);
    const learnerFriendly = assessLearnerFriendlyRationale({ rationale: item.rationale, whyWrong: item.whyWrong });
    assert.equal(learnerFriendly.passed, true, `${id} learner-friendly issues: ${learnerFriendly.issues.join("; ")}`);
    const distractors = assessDistractorPlausibility({ stem: item.stem, choices: item.answerChoices, correctAnswerIndexes: item.correctAnswerIndexes });
    assert.equal(distractors.passed, true, `${id} distractor issues: ${distractors.issues.join("; ")}`);
  }
});

test("revise and quarantine items are not accidentally marked alpha approved", () => {
  const expectedStatuses = new Map([
    ["assistive_devices_first20_q001_variant_a", "needs_light_revision"],
    ["assistive_devices_first20_q001_variant_b", "quarantined_rewrite_from_scratch"],
    ["assistive_devices_first20_q002_variant_a", "needs_structural_rewrite"],
    ["assistive_devices_first20_q002_variant_b", "needs_light_revision"],
    ["assistive_devices_first20_q003_variant_a", "needs_light_revision"],
    ["assistive_devices_first20_q003_variant_b", "needs_light_revision"],
    ["assistive_devices_first20_q008_variant_c", "needs_structural_rewrite"],
  ]);

  for (const [id, status] of expectedStatuses) {
    const item = getItem(id);
    assert.equal(item.reviewStatus, status, `${id} should be ${status}`);
    assert.notEqual(item.alphaSlice, true, `${id} must not be in learner-safe alpha slice`);
  }
});
