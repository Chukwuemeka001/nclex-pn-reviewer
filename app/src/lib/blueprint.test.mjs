import test from "node:test";
import assert from "node:assert/strict";
import { PLAN_VERSION, canonicalSubcategory, isKnownClientNeeds, isKnownSubcategory, buildBlueprintRef } from "./blueprint.js";

test("PLAN_VERSION is 2026-PN", () => {
  assert.equal(PLAN_VERSION, "2026-PN");
});

test("canonicalSubcategory maps stale Safety label to 2026 label", () => {
  assert.equal(canonicalSubcategory("Safety and Infection Control"), "Safety and Infection Prevention and Control");
});

test("canonicalSubcategory leaves canonical labels unchanged", () => {
  assert.equal(canonicalSubcategory("Coordinated Care"), "Coordinated Care");
});

test("buildBlueprintRef returns valid for known category+subcategory", () => {
  const ref = buildBlueprintRef({ clientNeeds: "Physiological Integrity", subcategory: "Reduction of Risk Potential" });
  assert.equal(ref.valid, true);
  assert.equal(ref.planVersion, "2026-PN");
  assert.equal(ref.clientNeeds, "Physiological Integrity");
  assert.equal(ref.subcategory, "Reduction of Risk Potential");
});

test("buildBlueprintRef normalizes stale subcategory and stays valid", () => {
  const ref = buildBlueprintRef({ clientNeeds: "Safe and Effective Care Environment", subcategory: "Safety and Infection Control" });
  assert.equal(ref.subcategory, "Safety and Infection Prevention and Control");
  assert.equal(ref.valid, true);
});

test("buildBlueprintRef flags unknown clientNeeds", () => {
  const ref = buildBlueprintRef({ clientNeeds: "Made Up" });
  assert.equal(ref.valid, false);
  assert.ok(ref.issues.some((i) => i.includes("clientNeeds")));
});

test("buildBlueprintRef flags subcategory not belonging to category", () => {
  const ref = buildBlueprintRef({ clientNeeds: "Psychosocial Integrity", subcategory: "Coordinated Care" });
  assert.equal(ref.valid, false);
  assert.ok(ref.issues.some((i) => i.includes("subcategory")));
});

test("category with no subcategory is valid when subcategory empty", () => {
  const ref = buildBlueprintRef({ clientNeeds: "Psychosocial Integrity" });
  assert.equal(ref.valid, true);
  assert.equal(ref.subcategory, null);
});
