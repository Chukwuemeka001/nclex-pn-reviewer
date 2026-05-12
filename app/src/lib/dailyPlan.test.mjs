import assert from "node:assert/strict";
import {
  buildDailyPlan,
  defaultDailyPlanPreferences,
  normalizeDailyPlanPreferences,
  safetyDrillForWeakArea,
} from "./dailyPlan.js";

const journalEntries = [
  {
    questionId: "q1",
    reason: "prioritization",
    status: "needs_remediation",
    tags: {
      clientNeeds: "Safe and Effective Care Environment",
      clinicalJudgment: "Take Action",
      topics: ["Respiratory"],
      safety: ["Priority"],
    },
  },
  {
    questionId: "q2",
    reason: "content_gap",
    status: "review_later",
    tags: {
      clientNeeds: "Physiological Integrity",
      clinicalJudgment: "Recognize Cues",
      topics: ["Pharmacology"],
      safety: [],
    },
  },
];

function testNormalizePreferencesClampsMinutesAndAddsDefaults() {
  const prefs = normalizeDailyPlanPreferences({ dailyMinutes: 999, anxietyLevel: 10 });
  assert.equal(prefs.dailyMinutes, 180);
  assert.equal(prefs.anxietyLevel, 5);
  assert.equal(prefs.questionSource, "any_qbank_or_app");
}

function testSafetyDrillFocusesDelegationForScopeWeakness() {
  const drill = safetyDrillForWeakArea("delegation_scope");
  assert.ok(drill.title.includes("Delegation"));
  assert.ok(drill.steps.some((step) => step.includes("PN/LPN")));
}

function testBuildDailyPlanUsesJournalAndWeakAreas() {
  const plan = buildDailyPlan({
    journalEntries,
    weakAreas: [{ label: "Pharmacology", percent: 40, group: "topicTags" }],
    preferences: { dailyMinutes: 45, examDate: "2026-07-01", anxietyLevel: 4 },
    now: "2026-05-12T12:00:00Z",
  });
  assert.equal(plan.totalMinutes, 45);
  assert.equal(plan.questionTarget.minimum, 8);
  assert.ok(plan.focusAreas.includes("Priority"));
  assert.ok(plan.focusAreas.includes("Pharmacology"));
  assert.ok(plan.blocks.some((block) => block.type === "error_journal"));
  assert.ok(plan.blocks.some((block) => block.type === "qbank_practice"));
}

function testBuildDailyPlanHandlesEmptyJournal() {
  const plan = buildDailyPlan({ journalEntries: [], weakAreas: [], preferences: defaultDailyPlanPreferences() });
  assert.equal(plan.warnings.length > 0, true);
  assert.ok(plan.blocks.some((block) => block.type === "diagnostic"));
}

function run() {
  testNormalizePreferencesClampsMinutesAndAddsDefaults();
  testSafetyDrillFocusesDelegationForScopeWeakness();
  testBuildDailyPlanUsesJournalAndWeakAreas();
  testBuildDailyPlanHandlesEmptyJournal();
  console.log("dailyPlan tests passed");
}

run();
