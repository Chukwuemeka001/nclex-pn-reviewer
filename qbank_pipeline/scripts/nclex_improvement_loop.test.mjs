import assert from "node:assert/strict";
import {
  buildImprovementLoop,
  buildModelAssistedRewriteBatch,
  buildModelRewriteRequest,
  buildRewritePlan,
  scoreQuestionCandidate,
  selectImprovementCandidates,
} from "./nclex_improvement_loop.mjs";

function sampleCandidate(overrides = {}) {
  return {
    id: "draft-1",
    status: "generated_review_candidate",
    itemType: "multiple_choice",
    stem: "A client with heart failure reports shortness of breath while lying flat. Which action should the practical nurse take first?",
    choices: ["Raise the head of the bed.", "Offer oral fluids.", "Document the finding.", "Apply a heating pad."],
    correctAnswerIndexes: [0],
    rationale: "Raising the head of the bed promotes lung expansion and is the priority immediate nursing action. Fluids may worsen overload. Documentation occurs after the immediate need is addressed. Heat does not address breathing.",
    whyWrong: ["Fluids may worsen overload.", "Documentation is not first.", "Heat does not address dyspnea."],
    tagging: {
      clientNeedsCategory: { id: "physiological_integrity", label: "Physiological Integrity" },
      clientNeedsSubcategory: { id: "reduction_of_risk", label: "Reduction of Risk Potential" },
      clinicalJudgmentStep: { id: "take_action", label: "Take Action" },
      questionType: { id: "multiple_choice", label: "Multiple Choice" },
      difficulty: { id: "medium", label: "Medium" },
      topicTags: [{ id: "cardiac", label: "Cardiac" }],
      skillTags: [{ id: "priority", label: "Priority" }],
      bodySystemTags: [{ id: "cardiovascular", label: "Cardiovascular" }],
    },
    audit: { primaryRiskLabel: "low_similarity_risk", clinicallySafe: true, riskLabels: ["low_similarity_risk"] },
    ...overrides,
  };
}

function testScoresStrongCandidateAsPublishReady() {
  const scored = scoreQuestionCandidate(sampleCandidate());
  assert.equal(scored.qualityScore.level, "publish_ready");
  assert.ok(scored.qualityScore.totalScore >= 32);
  assert.deepEqual(scored.weakestCriteria, []);
}

function testWeakQuestionGetsTargetedRewritePlan() {
  const candidate = sampleCandidate({
    stem: "What is heart failure?",
    choices: ["A disease.", "A food.", "A color.", "A number."],
    rationale: "Heart failure affects the heart.",
    whyWrong: [],
    tagging: {},
  });
  const scored = scoreQuestionCandidate(candidate);
  assert.notEqual(scored.qualityScore.level, "publish_ready");
  const plan = buildRewritePlan(scored);
  assert.ok(plan.rewriteFields.includes("stem"));
  assert.ok(plan.rewriteFields.includes("distractors"));
  assert.ok(plan.rewriteFields.includes("rationale"));
  assert.ok(plan.instructions.some((entry) => entry.includes("clinical decision")));
}

function testSelectsTenCandidatesWithApprovedFirst() {
  const candidates = Array.from({ length: 12 }, (_, index) => sampleCandidate({ id: `draft-${index}`, status: "generated_review_candidate" }));
  candidates[5] = sampleCandidate({ id: "approved-1", status: "reviewed_approved" });
  const selected = selectImprovementCandidates(candidates, 10);
  assert.equal(selected.length, 10);
  assert.equal(selected[0].id, "approved-1");
}

function testBuildImprovementLoopRescoresProposedRevision() {
  const loop = buildImprovementLoop([sampleCandidate({
    id: "weak-1",
    stem: "What is the best action?",
    rationale: "Do the safest action.",
    whyWrong: [],
  })], { limit: 1 });
  assert.equal(loop.items.length, 1);
  assert.ok(loop.items[0].initialScore.totalScore <= loop.items[0].rescore.totalScore);
  assert.ok(loop.summary.selectedCount === 1);
}

function testModelRewriteRequestTargetsOnlyWeakFieldsAndKeepsSafetyRules() {
  const loop = buildImprovementLoop([sampleCandidate({
    id: "weak-model-1",
    stem: "What is heart failure?",
    choices: ["A disease.", "A food.", "A color.", "A number."],
    rationale: "Heart failure affects the heart.",
    whyWrong: [],
    tagging: {},
  })], { limit: 1 });
  const request = buildModelRewriteRequest(loop.items[0]);
  assert.equal(request.id, "weak-model-1");
  assert.ok(request.allowedRewriteFields.includes("stem"));
  assert.ok(request.allowedRewriteFields.includes("distractors"));
  assert.ok(request.allowedRewriteFields.includes("rationale"));
  assert.ok(request.lockedFields.includes("correctAnswerIndexes"));
  assert.ok(request.systemPrompt.includes("Do not copy, imitate, paraphrase, or derive from UWorld"));
  assert.ok(request.userPrompt.includes("Return JSON only"));
  assert.equal(request.input.provenanceIncluded, false);
}

function testModelAssistedBatchAddsRequestsWithoutCallingPaidModel() {
  const loop = buildImprovementLoop([sampleCandidate({ id: "batch-1" })], { limit: 1 });
  const batch = buildModelAssistedRewriteBatch(loop, { provider: "anthropic", model: "claude-test" });
  assert.equal(batch.mode, "model_assisted_rewrite_request_pack_no_api_call");
  assert.equal(batch.provider, "anthropic");
  assert.equal(batch.model, "claude-test");
  assert.equal(batch.requests.length, 1);
  assert.equal(batch.requests[0].id, "batch-1");
}

function run() {
  testScoresStrongCandidateAsPublishReady();
  testWeakQuestionGetsTargetedRewritePlan();
  testSelectsTenCandidatesWithApprovedFirst();
  testBuildImprovementLoopRescoresProposedRevision();
  testModelRewriteRequestTargetsOnlyWeakFieldsAndKeepsSafetyRules();
  testModelAssistedBatchAddsRequestsWithoutCallingPaidModel();
  console.log("nclex_improvement_loop tests passed");
}

run();
