import assert from "node:assert/strict";
import {
  buildErrorJournalEntries,
  buildRemediationPlan,
  mergeJournalEntries,
  summarizeErrorJournal,
} from "./errorJournal.js";

const sampleQuestion = {
  id: "q1",
  stem: "A PN cares for a client with dyspnea. What is priority?",
  rationale: "Airway and breathing are priority.",
  tagging: {
    clientNeedsCategory: { label: "Safe and Effective Care Environment" },
    clinicalJudgmentStep: { label: "Take Action" },
    topicTags: [{ label: "Respiratory" }],
    safetyTags: [{ label: "Priority" }],
  },
};

function testBuildErrorJournalEntriesCapturesIncorrectAndFlagged() {
  const result = {
    scored: [
      { question: sampleQuestion, score: { isCorrect: false }, response: { selectedIndexes: [1] } },
      { question: { ...sampleQuestion, id: "q2" }, score: { isCorrect: true }, response: { selectedIndexes: [0] } },
    ],
    flaggedIds: ["q2"],
  };
  const entries = buildErrorJournalEntries(result, { defaultReason: "prioritization" });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].questionId, "q1");
  assert.equal(entries[0].reason, "prioritization");
  assert.equal(entries[0].status, "needs_remediation");
  assert.equal(entries[1].trigger, "flagged");
}

function testMergeJournalEntriesUpdatesExistingAttemptCount() {
  const existing = [{ questionId: "q1", attempts: 1, reason: "content_gap", updatedAt: "old" }];
  const incoming = [{ questionId: "q1", attempts: 1, reason: "prioritization", updatedAt: "new" }];
  const merged = mergeJournalEntries(existing, incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].attempts, 2);
  assert.equal(merged[0].reason, "prioritization");
}

function testBuildRemediationPlanCreatesDailyTasksFromWeakReasonsAndTags() {
  const plan = buildRemediationPlan([
    { ...buildErrorJournalEntries({ scored: [{ question: sampleQuestion, score: { isCorrect: false }, response: {} }], flaggedIds: [] })[0], reason: "prioritization" },
  ]);
  assert.equal(plan.length > 0, true);
  assert.ok(plan[0].task.includes("Priority"));
  assert.ok(plan.some((item) => item.task.includes("Take Action")));
}

function testSummarizeErrorJournalGroupsByReasonAndStatus() {
  const summary = summarizeErrorJournal([
    { questionId: "q1", reason: "prioritization", status: "needs_remediation" },
    { questionId: "q2", reason: "content_gap", status: "reviewed" },
  ]);
  assert.equal(summary.total, 2);
  assert.equal(summary.byReason.prioritization, 1);
  assert.equal(summary.byStatus.reviewed, 1);
}

function run() {
  testBuildErrorJournalEntriesCapturesIncorrectAndFlagged();
  testMergeJournalEntriesUpdatesExistingAttemptCount();
  testBuildRemediationPlanCreatesDailyTasksFromWeakReasonsAndTags();
  testSummarizeErrorJournalGroupsByReasonAndStatus();
  console.log("errorJournal tests passed");
}

run();
