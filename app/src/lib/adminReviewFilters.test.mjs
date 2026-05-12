import assert from "node:assert/strict";
import { filterReviewEntries } from "./adminReviewFilters.js";

const entries = [
  { item: { newQuestionId: "assistive_devices_first20_q001_variant_a", newStem: "Low vision tray question", modelAssistedRewrite: { appliedAt: "now" } } },
  { item: { newQuestionId: "assistive_devices_first20_q002_variant_a", newStem: "Vertigo safety question" } },
  { item: { newQuestionId: "other_q003", newStem: "Medication question", modelAssistedRewrite: { appliedAt: "now" } } },
];

function testFiltersByTextAcrossIdAndStem() {
  assert.deepEqual(filterReviewEntries(entries, { query: "vertigo" }).map((entry) => entry.item.newQuestionId), ["assistive_devices_first20_q002_variant_a"]);
  assert.deepEqual(filterReviewEntries(entries, { query: "q001" }).map((entry) => entry.item.newQuestionId), ["assistive_devices_first20_q001_variant_a"]);
}

function testCanShowOnlyModelAssistedRewrites() {
  assert.deepEqual(filterReviewEntries(entries, { modelAssistedOnly: true }).map((entry) => entry.item.newQuestionId), ["assistive_devices_first20_q001_variant_a", "other_q003"]);
}

function run() {
  testFiltersByTextAcrossIdAndStem();
  testCanShowOnlyModelAssistedRewrites();
  console.log("adminReviewFilters tests passed");
}

run();
