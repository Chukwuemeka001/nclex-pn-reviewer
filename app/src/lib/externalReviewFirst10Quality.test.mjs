import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { assessLearnerFriendlyRationale } from "./learnerFriendlyRationale.js";
import { assessDistractorPlausibility } from "./distractorQuality.js";
import { assessSingleAnswerPositionBalance, validateQuestionIntegrity } from "./questionIntegrity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const first10 = JSON.parse(readFileSync(join(__dirname, "../data/external_review_first10.json"), "utf8"));
const byId = new Map(first10.map((item) => [item.id, item]));

const approvedAlphaIds = [
  "assistive_devices_first20_q001_variant_a",
  "assistive_devices_first20_q001_variant_b",
  "assistive_devices_first20_q001_variant_c",
  "assistive_devices_first20_q002_variant_a",
  "assistive_devices_first20_q002_variant_b",
  "assistive_devices_first20_q002_variant_c",
  "assistive_devices_first20_q003_variant_a",
  "assistive_devices_first20_q003_variant_b",
  "assistive_devices_first20_q003_variant_c",
  "assistive_devices_first20_q008_variant_c",
];

function getItem(id) {
  const item = byId.get(id);
  assert.ok(item, `Expected ${id} to exist in first-10 review data`);
  return item;
}

test("approved alpha answer distribution stays balanced", () => {
  const approved = approvedAlphaIds.map((id) => getItem(id));
  const maxShare = approved.length >= 10 ? 0.5 : 0.75;
  const balance = assessSingleAnswerPositionBalance(approved, { maxShare, minDistinct: 3 });
  assert.equal(balance.passed, true, `Answer-key balance issues: ${balance.issues.join("; ")} histogram=${JSON.stringify(balance.histogram)}`);
});

test("all first10 items keep answer-key integrity", () => {
  for (const item of first10) {
    const integrity = validateQuestionIntegrity(item, { strictItemType: false });
    assert.equal(integrity.passed, true, `${item.id} integrity errors: ${integrity.errors.join("; ")}`);
    assert.deepEqual(item.correctAnswerText, integrity.normalized.correctAnswerText, `${item.id} correctAnswerText is out of sync with keyed index`);
  }
});

test("approved alpha items carry specific why-wrong teaching and pass existing guards", () => {
  for (const id of approvedAlphaIds) {
    const item = getItem(id);
    assert.ok(
      item.reviewStatus === "candidate_approved_alpha" || item.reviewStatus === "approved_alpha",
      `${item.id} has unexpected status: ${item.reviewStatus}`
    );
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

test("all items have valid review status", () => {
  // Every item must be in a recognized review status.
  // approved_alpha/candidate_approved_alpha: promoted items (alphaSlice=true)
  // new_pending_review: new items awaiting first review (alphaSlice=false)
  for (const item of first10) {
    assert.ok(
      item.reviewStatus === "approved_alpha" ||
      item.reviewStatus === "candidate_approved_alpha" ||
      item.reviewStatus === "new_pending_review",
      `${item.id} has unexpected status: ${item.reviewStatus}`
    );
  }
});
