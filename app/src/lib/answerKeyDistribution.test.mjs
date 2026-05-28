import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadDataset() {
  const first10Path = join(__dirname, "../data/external_review_first10.json");
  const first10 = readJson(first10Path);

  const approvedPath = resolve(__dirname, "../../../../qbank_pipeline/approved_questions/review_console_approved_questions.json");
  const approved = existsSync(approvedPath) ? readJson(approvedPath) : [];

  // Prefer learner-eligible approved items. If no approved pool exists yet, use approved alpha slice from first10.
  const approvedPool = Array.isArray(approved) ? approved : [];
  const fallbackAlpha = first10.filter((item) => item.reviewStatus === "candidate_approved_alpha" && item.alphaSlice === true);

  const selected = approvedPool.length > 0 ? approvedPool : fallbackAlpha;
  return { selected, source: approvedPool.length > 0 ? "approved_pool" : "first10_alpha_fallback" };
}

function summarize(items) {
  const singles = items.filter((item) => Array.isArray(item.correctAnswerIndexes) && item.correctAnswerIndexes.length === 1);
  const counts = new Map();
  for (const item of singles) {
    const idx = Number(item.correctAnswerIndexes[0]);
    if (Number.isInteger(idx)) counts.set(idx, (counts.get(idx) || 0) + 1);
  }
  const n = singles.length;
  const props = {};
  for (const k of [0, 1, 2, 3]) {
    props[k] = n ? (counts.get(k) || 0) / n : 0;
  }
  const maxDev = Math.max(...Object.values(props).map((p) => Math.abs(p - 0.25)));
  return { n, singles, counts: Object.fromEntries(counts), props, maxDev };
}

function evaluateGate(summary) {
  const { n, props, maxDev } = summary;
  const pVals = [props[0], props[1], props[2], props[3]];
  const minP = Math.min(...pVals);
  const maxP = Math.max(...pVals);

  if (n < 10) {
    return { tier: "very_small", pass: true, reason: `n=${n} (too small for hard distribution gating)` };
  }

  if (n < 40) {
    const hardFail = minP < 0.10 || maxP > 0.40 || maxDev > 0.15;
    return { tier: "small", pass: !hardFail, reason: `n=${n}, minP=${minP.toFixed(3)}, maxP=${maxP.toFixed(3)}, maxDev=${maxDev.toFixed(3)}` };
  }

  if (n < 120) {
    const pass = minP >= 0.15 && maxP <= 0.35 && maxDev <= 0.10;
    return { tier: "medium", pass, reason: `n=${n}, minP=${minP.toFixed(3)}, maxP=${maxP.toFixed(3)}, maxDev=${maxDev.toFixed(3)}` };
  }

  const pass = minP >= 0.18 && maxP <= 0.32 && maxDev <= 0.07;
  return { tier: "large", pass, reason: `n=${n}, minP=${minP.toFixed(3)}, maxP=${maxP.toFixed(3)}, maxDev=${maxDev.toFixed(3)}` };
}

test("dataset-level SBA answer-key distribution gate", () => {
  const { selected, source } = loadDataset();
  assert.ok(selected.length > 0, "No dataset items available for distribution gate");

  // Schema sanity gate before distribution gate.
  for (const item of selected) {
    assert.ok(Array.isArray(item.correctAnswerIndexes), `${item.id || "unknown"}: correctAnswerIndexes missing`);
    assert.ok(item.correctAnswerIndexes.length === 1, `${item.id || "unknown"}: expected single-best-answer item with exactly one keyed index`);
  }

  const summary = summarize(selected);
  assert.ok(summary.n > 0, `No single-best-answer items found in source=${source}`);

  const gate = evaluateGate(summary);
  assert.equal(
    gate.pass,
    true,
    `Answer-key distribution gate failed (${gate.tier}) source=${source}. ${gate.reason}. counts=${JSON.stringify(summary.counts)} props=${JSON.stringify(summary.props)}`,
  );
});
