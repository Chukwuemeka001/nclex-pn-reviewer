import assert from "node:assert/strict";
import {
  NCLEX_QUALITY_RUBRIC,
  emptyQualityRubric,
  scoreQualityRubric,
  validateQualityRubric,
} from "./nclexQualityRubric.js";

function passingRubric() {
  const rubric = emptyQualityRubric();
  for (const criterion of NCLEX_QUALITY_RUBRIC) {
    rubric[criterion.id] = {
      score: 4,
      note: `Reviewed ${criterion.label}: passes NCLEX-PN style expectations.`,
    };
  }
  return rubric;
}

function testEmptyRubricHasEveryCriterion() {
  const rubric = emptyQualityRubric();
  assert.equal(Object.keys(rubric).length, NCLEX_QUALITY_RUBRIC.length);
  for (const criterion of NCLEX_QUALITY_RUBRIC) {
    assert.deepEqual(rubric[criterion.id], { score: "", note: "" });
  }
}

function testPassingRubricScoresAsPublishable() {
  const result = scoreQualityRubric(passingRubric());
  assert.equal(result.maxScore, 40);
  assert.equal(result.totalScore, 40);
  assert.equal(result.percent, 100);
  assert.equal(result.level, "publish_ready");
  assert.deepEqual(result.blockers, []);
}

function testBorderlineRubricRequiresRevision() {
  const rubric = passingRubric();
  rubric.rationaleQuality.score = 2;
  rubric.rationaleQuality.note = "Rationale states the right answer but does not teach why each distractor is wrong.";
  const result = scoreQualityRubric(rubric);
  assert.equal(result.level, "revise_before_publish");
  assert.match(result.blockers.join(" "), /Rationale quality/);
}

function testCriticalCriterionBlocksApprovalEvenIfTotalIsHigh() {
  const rubric = passingRubric();
  rubric.clinicalAccuracy.score = 2;
  rubric.clinicalAccuracy.note = "Possible clinical inaccuracy remains.";
  const issues = validateQualityRubric(rubric);
  assert.ok(issues.some((issue) => issue.includes("Clinical accuracy")));
}

function testMissingReviewerNoteBlocksApproval() {
  const rubric = passingRubric();
  rubric.originalitySafety.note = "";
  const issues = validateQualityRubric(rubric);
  assert.ok(issues.some((issue) => issue.includes("Originality/source safety")));
}

function run() {
  testEmptyRubricHasEveryCriterion();
  testPassingRubricScoresAsPublishable();
  testBorderlineRubricRequiresRevision();
  testCriticalCriterionBlocksApprovalEvenIfTotalIsHigh();
  testMissingReviewerNoteBlocksApproval();
  console.log("nclexQualityRubric tests passed");
}

run();
