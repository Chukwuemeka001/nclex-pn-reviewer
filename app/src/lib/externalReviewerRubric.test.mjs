import assert from "node:assert/strict";
import {
  EXTERNAL_REVIEW_CRITERIA,
  FIRST_TEN_REVIEW_IDS,
  buildGitHubIssueUrl,
  buildReviewIssueBody,
  REVIEWER_PROFILES,
  buildReviewerNoteTemplate,
  getReviewerProfile,
  scoreExternalReview,
  summarizeReviewerDecision,
} from "./externalReviewerRubric.js";

function testRubricHasClearColdReviewerCriteria() {
  assert.equal(EXTERNAL_REVIEW_CRITERIA.length, 6);
  assert.ok(EXTERNAL_REVIEW_CRITERIA.every((criterion) => criterion.id && criterion.label && criterion.lookFor.length >= 3));
  assert.ok(EXTERNAL_REVIEW_CRITERIA.some((criterion) => criterion.id === "distractors"));
  assert.ok(EXTERNAL_REVIEW_CRITERIA.some((criterion) => criterion.id === "pnScope"));
}

function testReviewerScoreRequiresCriticalSafetyPass() {
  const scores = {
    stemRealism: 4,
    distractors: 4,
    rationaleTeaching: 4,
    pnScope: 1,
    clinicalSafety: 4,
    studentExperience: 4,
  };
  const result = scoreExternalReview(scores);
  assert.equal(result.total, 21);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.blockers.some((blocker) => blocker.includes("PN scope")));
}

function testReviewerScoreCanPassStrongQuestion() {
  const result = scoreExternalReview({
    stemRealism: 4,
    distractors: 3,
    rationaleTeaching: 4,
    pnScope: 4,
    clinicalSafety: 4,
    studentExperience: 3,
  });
  assert.equal(result.total, 22);
  assert.equal(result.decision, "PASS");
  assert.deepEqual(result.blockers, []);
}

function testTemplateIncludesExpectedStructureAndIds() {
  assert.equal(FIRST_TEN_REVIEW_IDS.length, 10);
  const template = buildReviewerNoteTemplate("assistive_devices_first20_q001_variant_a");
  assert.ok(template.includes("ID: assistive_devices_first20_q001_variant_a"));
  assert.ok(template.includes("Decision: PASS / FIX / REJECT"));
  assert.ok(template.includes("Scores:"));
  assert.ok(template.includes("Alexis notes:"));
}

function testSummaryExplainsDecisionBands() {
  assert.equal(summarizeReviewerDecision("PASS"), "Good enough to move to the next review stage; not automatically public-ready.");
  assert.equal(summarizeReviewerDecision("FIX"), "Useful item idea, but it needs revision before approval.");
  assert.equal(summarizeReviewerDecision("REJECT"), "Do not salvage unless there is a strong reason; rebuild or discard.");
}

function testGitHubIssueCaptureUrlIsPrefilledAndPrivateSafe() {
  const item = { id: "q1", stem: "A client needs help. What should the PN do first?", answerChoices: ["Assess", "Ignore"], correctAnswerText: "Assess", rationale: "Assessment first." };
  const response = { reviewerName: "Alexis", decision: "FIX", issueType: "rationale", severity: "important", notes: "Needs better why-wrong teaching.", suggestedFix: "Explain why Ignore is unsafe.", scores: { stemRealism: 3, distractors: 2, rationaleTeaching: 2, pnScope: 4, clinicalSafety: 4, studentExperience: 3 } };
  const body = buildReviewIssueBody(item, response);
  assert.ok(body.includes("Question ID: q1"));
  assert.ok(body.includes("Reviewer: Alexis"));
  assert.ok(body.includes("Privacy/safety acknowledgement"));
  const url = buildGitHubIssueUrl({ repo: "Chukwuemeka001/nclex-pn-reviewer", item, response });
  assert.ok(url.startsWith("https://github.com/Chukwuemeka001/nclex-pn-reviewer/issues/new?"));
  const parsed = new URL(url);
  assert.ok(parsed.searchParams.get("title").includes("[Review][Alexis] q1"));
  assert.ok(parsed.searchParams.get("body").includes("Needs better why-wrong teaching."));
}

function testReviewerProfilesCoverAlexisAndIhechi() {
  assert.equal(REVIEWER_PROFILES.alexis.name, "Alexis");
  assert.equal(REVIEWER_PROFILES.ihechi.name, "Ihechi");
  assert.match(REVIEWER_PROFILES.ihechi.role, /non-clinical/i);
  assert.ok(REVIEWER_PROFILES.ihechi.primaryLens.some((lens) => /AI-generated|source-safety|clarity/i.test(lens)));
  assert.equal(getReviewerProfile("ihechi").name, "Ihechi");
  assert.equal(getReviewerProfile("unknown").name, "Alexis");
}

function testIhechiIssueCaptureIncludesRoleLensAndCopyrightAttestation() {
  const item = { id: "q2", stem: "Which statement needs follow-up?", answerChoices: ["A", "B"], correctAnswerText: "B", rationale: "Because B is unsafe." };
  const response = { reviewerName: "Ihechi", reviewerKey: "ihechi", reviewerRole: REVIEWER_PROFILES.ihechi.role, decision: "FIX", issueType: "too generated, source concern", severity: "important", notes: "The rationale sounds AI generated and the stem may be too similar to a prep-bank pattern.", suggestedFix: "Rewrite with a fresh clinical setup and cite an OER concept source.", scores: { stemRealism: 2, distractors: 3, rationaleTeaching: 2, pnScope: 3, clinicalSafety: 3, studentExperience: 3 } };
  const body = buildReviewIssueBody(item, response);
  assert.ok(body.includes("Reviewer: Ihechi"));
  assert.ok(body.includes("Reviewer role: Non-clinical clarity/source-safety reviewer"));
  assert.ok(body.includes("Role lens"));
  assert.ok(body.includes("Copyright/source-safety acknowledgement"));
  assert.ok(body.includes("I did not paste unpublished questions into public AI/search tools"));
  const url = buildGitHubIssueUrl({ repo: "Chukwuemeka001/nclex-pn-reviewer", item, response });
  const parsed = new URL(url);
  assert.ok(parsed.searchParams.get("title").includes("[Ihechi]"));
  assert.ok(parsed.searchParams.get("body").includes("too similar to a prep-bank pattern"));
}

function run() {
  testReviewerProfilesCoverAlexisAndIhechi();
  testRubricHasClearColdReviewerCriteria();
  testReviewerScoreRequiresCriticalSafetyPass();
  testReviewerScoreCanPassStrongQuestion();
  testTemplateIncludesExpectedStructureAndIds();
  testSummaryExplainsDecisionBands();
  testGitHubIssueCaptureUrlIsPrefilledAndPrivateSafe();
  testIhechiIssueCaptureIncludesRoleLensAndCopyrightAttestation();
  console.log("externalReviewerRubric tests passed");
}

run();
