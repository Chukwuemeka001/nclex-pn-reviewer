import assert from "node:assert/strict";
import {
  applyModelRewrite,
  buildReviewerChecklist,
  buildApplyRewritePayload,
  normalizeRewriteRequest,
  summarizeRewriteBatch,
} from "./rewriteWorkbench.js";

const sampleRequest = {
  id: "q1",
  allowedRewriteFields: ["stem", "rationale"],
  lockedFields: ["correctAnswerIndexes", "choices"],
  input: {
    initialScore: { totalScore: 28, maxScore: 40, level: "revise_before_publish" },
    weakestCriteria: [{ id: "cognitiveLevel", label: "Cognitive level", score: 2 }],
    currentFields: {
      stem: "What is heart failure?",
      rationale: "Heart failure affects the heart.",
      choices: ["A", "B", "C", "D"],
    },
    correctAnswerIndexes: [0],
    itemType: "multiple_choice",
  },
};

function testNormalizeRewriteRequestKeepsOnlyReviewRelevantFields() {
  const normalized = normalizeRewriteRequest(sampleRequest);
  assert.equal(normalized.id, "q1");
  assert.deepEqual(normalized.allowedRewriteFields, ["stem", "rationale"]);
  assert.deepEqual(normalized.lockedFields, ["correctAnswerIndexes", "choices"]);
  assert.equal(normalized.scoreLabel, "28/40 revise_before_publish");
  assert.equal(normalized.weakestCriteria[0].id, "cognitiveLevel");
}

function testApplyModelRewriteOnlyChangesAllowedFields() {
  const applied = applyModelRewrite(sampleRequest, {
    rewrittenFields: {
      stem: "A practical nurse cares for a client with dyspnea. Which action is the priority?",
      choices: ["Unsafe changed choice"],
      rationale: "The priority is to address breathing first and then document after the client is stable.",
    },
    reviewerWarnings: ["Verify clinical accuracy."],
  });
  assert.equal(applied.proposed.stem, "A practical nurse cares for a client with dyspnea. Which action is the priority?");
  assert.equal(applied.proposed.rationale.includes("breathing"), true);
  assert.equal(applied.blockedChanges.includes("choices"), true);
  assert.equal(applied.reviewStatus, "needs_human_review");
}

function testReviewerChecklistRequiresHumanClinicalAndSourceReview() {
  const checklist = buildReviewerChecklist(sampleRequest);
  assert.ok(checklist.some((item) => item.includes("clinical accuracy")));
  assert.ok(checklist.some((item) => item.includes("source-safety")));
  assert.ok(checklist.some((item) => item.includes("locked fields")));
}

function testSummarizeRewriteBatchCountsRequestsAndWeakCriteria() {
  const summary = summarizeRewriteBatch({ requests: [sampleRequest, { ...sampleRequest, id: "q2", allowedRewriteFields: ["distractors"] }] });
  assert.equal(summary.totalRequests, 2);
  assert.equal(summary.fieldCounts.stem, 1);
  assert.equal(summary.fieldCounts.distractors, 1);
  assert.equal(summary.weakCriteriaCounts.cognitiveLevel, 2);
}

function testBuildApplyRewritePayloadRequiresReviewerNoteAndSafetyStatement() {
  const applied = applyModelRewrite(sampleRequest, {
    rewrittenFields: {
      stem: "A practical nurse cares for a client with dyspnea. Which action is the priority?",
      rationale: "The priority is to address breathing first and then document after the client is stable.",
    },
    changeSummary: ["Made stem priority-focused."],
    sourceSafetyStatement: "Original rewrite; no proprietary source copied.",
  });
  const payload = buildApplyRewritePayload(sampleRequest, applied, {
    reviewerName: "Emeka",
    reviewerNote: "Clinically review before approval.",
  });
  assert.equal(payload.id, "q1");
  assert.deepEqual(Object.keys(payload.rewrittenFields).sort(), ["rationale", "stem"]);
  assert.deepEqual(payload.allowedRewriteFields, ["stem", "rationale"]);
  assert.equal(payload.reviewStatus, "needs_human_review");
  assert.ok(payload.reviewerNote.includes("Clinically"));
  assert.ok(payload.sourceSafetyStatement.includes("Original"));
}

function run() {
  testNormalizeRewriteRequestKeepsOnlyReviewRelevantFields();
  testApplyModelRewriteOnlyChangesAllowedFields();
  testReviewerChecklistRequiresHumanClinicalAndSourceReview();
  testSummarizeRewriteBatchCountsRequestsAndWeakCriteria();
  testBuildApplyRewritePayloadRequiresReviewerNoteAndSafetyStatement();
  console.log("rewriteWorkbench tests passed");
}

run();
