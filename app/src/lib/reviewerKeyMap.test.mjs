import test from "node:test";
import assert from "node:assert/strict";
import { mapReviewerScores, scoreExternalReview } from "./externalReviewerRubric.js";

test("maps long-form reviewer keys to canonical scorer ids", () => {
  const mapped = mapReviewerScores({
    stemRealismAndClarity: 4,
    distractorPlausibility: 3,
    rationaleTeachingQuality: 4,
    scopeFitPnRpnLpn: 4,
    clinicalSafetyAndAccuracy: 3,
    studentExperienceAfterLongShift: 2,
  });

  assert.deepEqual(mapped, {
    stemRealism: 4,
    distractors: 3,
    rationaleTeaching: 4,
    pnScope: 4,
    clinicalSafety: 3,
    studentExperience: 2,
  });
});

test("accepts canonical keys unchanged", () => {
  const canonical = {
    stemRealism: 4,
    distractors: 4,
    rationaleTeaching: 4,
    pnScope: 4,
    clinicalSafety: 4,
    studentExperience: 4,
  };
  assert.deepEqual(mapReviewerScores(canonical), canonical);
});

test("throws on missing required criterion", () => {
  assert.throws(
    () =>
      mapReviewerScores({
        stemRealismAndClarity: 4,
        distractorPlausibility: 4,
        rationaleTeachingQuality: 4,
        scopeFitPnRpnLpn: 4,
        studentExperienceAfterLongShift: 4,
      }),
    /Missing required reviewer score keys: clinicalSafety/
  );
});

test("computed decision keeps critical-floor reject", () => {
  const mapped = mapReviewerScores({
    stemRealismAndClarity: 4,
    distractorPlausibility: 4,
    rationaleTeachingQuality: 4,
    scopeFitPnRpnLpn: 4,
    clinicalSafetyAndAccuracy: 2,
    studentExperienceAfterLongShift: 4,
  });
  const result = scoreExternalReview(mapped);
  assert.equal(result.decision, "REJECT");
});
