import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  deriveQuestionFamilyKey,
  selectSessionQuestionsWithDiversity,
  maxAdjacentFamilyRun,
  evaluateDiversityFeasibility,
} from "./sessionDiversity.js";

test("deriveQuestionFamilyKey collapses variant siblings", () => {
  assert.equal(deriveQuestionFamilyKey({ id: "assistive_devices_first20_q001_variant_a" }), "assistive_devices_first20_q001");
  assert.equal(deriveQuestionFamilyKey({ id: "assistive_devices_first20_q001_variant_c" }), "assistive_devices_first20_q001");
});

test("deriveQuestionFamilyKey prefers explicit familyKey", () => {
  assert.equal(
    deriveQuestionFamilyKey({ familyKey: "vision-loss-family", id: "assistive_devices_first20_q001_variant_a" }),
    "vision-loss-family",
  );
});

test("diversity selector avoids adjacent same-family when alternatives exist", () => {
  const pool = [
    { id: "q001_variant_a", stem: "Vision loss tray orientation A" },
    { id: "q001_variant_b", stem: "Vision loss tray orientation B" },
    { id: "q002_variant_a", stem: "Vertigo safety sit down" },
    { id: "q002_variant_b", stem: "Vertigo safety call help" },
    { id: "q003_variant_a", stem: "Prosthesis communication" },
    { id: "q003_variant_b", stem: "Prosthesis skin check" },
  ];

  const selected = selectSessionQuestionsWithDiversity(pool, 6);
  assert.equal(maxAdjacentFamilyRun(selected), 1);
});

test("real served artifact yields zero adjacent same-family at n=10", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const artifact = JSON.parse(fs.readFileSync(path.join(here, "../data/served_questions.json"), "utf8"));
  const selected = selectSessionQuestionsWithDiversity(artifact.questions, 10);
  assert.equal(selected.length, 10);
  assert.equal(maxAdjacentFamilyRun(selected), 1);
});

test("skewed pools surface infeasibility and still minimize adjacent run", () => {
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `q001_variant_${i}`, familyKey: "q001", stem: `vision ${i}` })),
    { id: "q002_variant_a", familyKey: "q002", stem: "vertigo" },
    { id: "q008_variant_a", familyKey: "q008", stem: "brace" },
  ];

  const feasibility = evaluateDiversityFeasibility(pool);
  assert.equal(feasibility.noAdjacentAchievable, false);

  const selected = selectSessionQuestionsWithDiversity(pool, 10);
  assert.equal(selected.length, 10);

  const others = pool.length - feasibility.maxFamilyCount;
  const optimalRun = Math.ceil(feasibility.maxFamilyCount / (others + 1));
  const run = maxAdjacentFamilyRun(selected);
  assert.ok(run <= optimalRun, `run ${run} exceeds optimal ${optimalRun}`);
});

test("feasible balanced pool yields zero adjacent runs", () => {
  const pool = [
    ...Array.from({ length: 3 }, (_, i) => ({ id: `q001_variant_${i}`, familyKey: "q001", stem: `vision ${i}` })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `q002_variant_${i}`, familyKey: "q002", stem: `vertigo ${i}` })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `q003_variant_${i}`, familyKey: "q003", stem: `prosthesis ${i}` })),
    { id: "q008_variant_a", familyKey: "q008", stem: "brace" },
  ];

  const selected = selectSessionQuestionsWithDiversity(pool, 10);
  assert.equal(selected.length, 10);
  assert.equal(maxAdjacentFamilyRun(selected), 1);
});

test("selection maximizes family spread when target < pool", () => {
  const pool = [];
  for (let f = 1; f <= 4; f += 1) {
    for (let i = 0; i < 5; i += 1) {
      pool.push({ id: `q${f}_variant_${i}`, familyKey: `q${f}`, stem: `fam${f} stem ${i}` });
    }
  }

  const selected = selectSessionQuestionsWithDiversity(pool, 8);
  assert.equal(selected.length, 8);

  const counts = new Map();
  for (const q of selected) {
    const f = deriveQuestionFamilyKey(q);
    counts.set(f, (counts.get(f) || 0) + 1);
  }
  assert.ok(counts.size >= 4, `expected >=4 families, got ${counts.size}`);
  for (const count of counts.values()) {
    assert.ok(count <= 2, `family over-concentrated with count ${count}`);
  }
});

test("tiny pool returns without crash", () => {
  const selected = selectSessionQuestionsWithDiversity([{ id: "q001_variant_a", familyKey: "q001", stem: "one" }], 10);
  assert.equal(selected.length, 1);
});

test("all-same-family pool returns full count", () => {
  const pool = Array.from({ length: 4 }, (_, i) => ({ id: `q001_variant_${i}`, familyKey: "q001", stem: `same ${i}` }));
  const selected = selectSessionQuestionsWithDiversity(pool, 4);
  assert.equal(selected.length, 4);
  assert.equal(maxAdjacentFamilyRun(selected), 4);
});

test("scales without quadratic blowup", () => {
  const pool = [];
  for (let family = 1; family <= 40; family += 1) {
    for (let i = 0; i < 10; i += 1) {
      pool.push({ id: `q${family}_variant_${i}`, familyKey: `q${family}`, stem: `family ${family} stem ${i}` });
    }
  }

  const t0 = performance.now();
  const selected = selectSessionQuestionsWithDiversity(pool, 75);
  const elapsed = performance.now() - t0;

  assert.equal(selected.length, 75);
  assert.equal(maxAdjacentFamilyRun(selected), 1);
  assert.ok(elapsed < 100, `selection took ${elapsed.toFixed(2)}ms (expected <100ms)`);
});

test("missing id and stem collapse to unknown family safely", () => {
  const selected = selectSessionQuestionsWithDiversity([{}, {}], 2);
  assert.equal(selected.length, 2);
});

test("diversity selector returns requested count when pool allows", () => {
  const pool = Array.from({ length: 10 }, (_, i) => ({ id: `q${String(i + 1).padStart(3, "0")}`, stem: `Question ${i + 1}` }));
  const selected = selectSessionQuestionsWithDiversity(pool, 10);
  assert.equal(selected.length, 10);
});
