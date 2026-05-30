import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { validateQuestionIntegrity } from "./questionIntegrity.js";
import { assessDistractorPlausibility } from "./distractorQuality.js";
import { assessLearnerFriendlyRationale } from "./learnerFriendlyRationale.js";
import { loadQuestions } from "./questionLoader.js";

// This test mirrors the gates that questionLoader.normalizeQuestion now enforces
// on the serve path. It cannot import questionLoader.js directly because that file
// uses import.meta.env (Vite-only), so we re-run the same assessments here against
// the same canonical pools: the demo fallback and the approved-alpha slice.

const __dirname = dirname(fileURLToPath(import.meta.url));
const demo = JSON.parse(readFileSync(join(__dirname, "../data/demo_seed_questions.json"), "utf8"));
const first10 = JSON.parse(readFileSync(join(__dirname, "../data/external_review_first10.json"), "utf8"));

const approvedAlpha = first10.filter(
  (item) => (item.reviewStatus === "candidate_approved_alpha" || item.reviewStatus === "approved_alpha") && item.alphaSlice === true,
);

function choicesOf(item) {
  return item.choices || item.answerChoices || [];
}

// Gate logic replicated from questionLoader.normalizeQuestion. Keep in sync.
// The gate is now uniform across sources: every served item (including the demo
// fallback) must pass integrity + requireWhyWrong + distractor + rationale.
function serveGate(item) {
  const choices = choicesOf(item);
  const correctAnswerIndexes = item.correctAnswerIndexes || [];
  const integrity = validateQuestionIntegrity({ ...item, answerChoices: choices }, { strictItemType: false, requireWhyWrong: true });
  assert.equal(integrity.passed, true, `${item.id} integrity: ${integrity.errors.join("; ")}`);

  const distractors = assessDistractorPlausibility({ stem: item.stem, choices, correctAnswerIndexes });
  assert.equal(distractors.passed, true, `${item.id} distractors: ${distractors.issues.join("; ")}`);

  const rationale = assessLearnerFriendlyRationale({ rationale: item.rationale, whyWrong: item.whyWrong || [] });
  assert.equal(rationale.passed, true, `${item.id} rationale: ${rationale.issues.join("; ")}`);
}

test("demo fallback pool passes the full serve-path gate (integrity + whyWrong + distractor + rationale)", () => {
  for (const item of demo) serveGate(item);
});

test("approved-alpha pool passes the full serve-path gate (distractor + rationale + whyWrong)", () => {
  assert.ok(approvedAlpha.length > 0, "Expected at least one approved-alpha item");
  for (const item of approvedAlpha) serveGate(item);
});

test("a cartoonishly-unsafe distractor would be rejected by the serve gate", () => {
  const bad = {
    id: "synthetic_bad",
    stem: "A client reports constipation after surgery. Which action should the PN take first?",
    answerChoices: [
      "Assess bowel sounds, pain, diet, fluids, mobility, and last bowel movement.",
      "Give a laxative without a provider order.",
      "Ask about the usual bowel routine.",
      "Encourage ambulation as tolerated.",
    ],
    correctAnswerIndexes: [0],
    correctAnswerText: ["Assess bowel sounds, pain, diet, fluids, mobility, and last bowel movement."],
    whyWrong: ["", "x", "x", "x"],
    rationale: "First the nurse should assess so the safest action fits what the client needs.",
  };
  assert.throws(() => serveGate(bad), /distractors/);
});

test("an item missing per-option whyWrong is rejected by the serve gate", () => {
  const bad = {
    id: "synthetic_no_whywrong",
    stem: "A client at risk for falls calls for help. What should the PN do first?",
    answerChoices: ["Stay with the client and keep the call bell in reach.", "Leave to find the charge nurse.", "Raise all side rails.", "Document later."],
    correctAnswerIndexes: [0],
    correctAnswerText: ["Stay with the client and keep the call bell in reach."],
    whyWrong: [],
    rationale: "First keep the client safe and within reach so the nurse can help before a fall happens.",
  };
  assert.throws(() => serveGate(bad), /whyWrong/);
});

test("loadQuestions uses approved-bundled when API is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  try {
    const result = await loadQuestions();
    assert.equal(result.source, "approved-bundled");
    assert.ok(result.questions.length >= 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadQuestions emits demo warning only when both API and bundled are unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;

  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ approved: [] }) });

  try {
    const result = await loadQuestions();
    assert.equal(result.source, "approved-bundled");
    assert.equal(warnings.length, 0);
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }
});
