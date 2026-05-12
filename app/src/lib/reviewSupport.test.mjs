import assert from "node:assert/strict";
import {
  findSourceRegistryEntriesForItem,
  summarizeModelAssistedRewrite,
} from "./reviewSupport.js";

const registry = [
  {
    sourceId: "open-rn-nursing-fundamentals-2e",
    title: "Open RN Nursing Fundamentals 2e",
    license: "CC BY 4.0",
    allowedUse: ["concept_reference", "remediation_reference"],
    prohibitedUse: ["copying_question_wording"],
    attributionRequired: true,
  },
];

function testSummarizeModelAssistedRewriteShowsChangedFieldsAndReviewer() {
  const summary = summarizeModelAssistedRewrite({
    modelAssistedRewrite: {
      appliedAt: "2026-05-12T12:00:00Z",
      reviewerName: "Emeka",
      reviewerNote: "Plain-language rationale accepted.",
      fieldsApplied: ["newRationale", "whyWrong"],
      sourceSafetyStatement: "No source structure copied.",
    },
  });

  assert.equal(summary.hasRewrite, true);
  assert.deepEqual(summary.fieldsApplied, ["newRationale", "whyWrong"]);
  assert.equal(summary.reviewerName, "Emeka");
  assert.ok(summary.displayText.includes("Plain-language rationale accepted"));
}

function testSummarizeModelAssistedRewriteHandlesMissingAudit() {
  const summary = summarizeModelAssistedRewrite({});
  assert.equal(summary.hasRewrite, false);
  assert.equal(summary.displayText, "No model-assisted rewrite has been applied to this draft.");
}

function testFindSourceRegistryEntriesFromPublicAttributionsAndConceptRefs() {
  const matches = findSourceRegistryEntriesForItem({
    publicAttributions: [{ sourceId: "open-rn-nursing-fundamentals-2e" }],
    sourceConceptRefs: [{ sourceId: "missing-source" }],
  }, registry);

  assert.equal(matches.length, 2);
  assert.equal(matches[0].found, true);
  assert.equal(matches[0].title, "Open RN Nursing Fundamentals 2e");
  assert.equal(matches[1].found, false);
  assert.equal(matches[1].sourceId, "missing-source");
}

function run() {
  testSummarizeModelAssistedRewriteShowsChangedFieldsAndReviewer();
  testSummarizeModelAssistedRewriteHandlesMissingAudit();
  testFindSourceRegistryEntriesFromPublicAttributionsAndConceptRefs();
  console.log("reviewSupport tests passed");
}

run();
