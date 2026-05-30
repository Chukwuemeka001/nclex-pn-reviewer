import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assessDistractorPlausibility } from "./distractorQuality.js";
import { assessLearnerFriendlyRationale } from "./learnerFriendlyRationale.js";
import { validateQuestionIntegrity } from "./questionIntegrity.js";

const here = dirname(fileURLToPath(import.meta.url));
const questions = JSON.parse(readFileSync(join(here, "../data/demo_seed_questions.json"), "utf8"));

function testDemoSeedQuestionsAvoidCartoonishlyUnsafeDistractors() {
  const failures = questions
    .map((question) => ({ question, result: assessDistractorPlausibility(question) }))
    .filter(({ result }) => !result.passed);

  assert.deepEqual(failures.map(({ question }) => question.id), []);
}

// The demo seed is the fallback pool served when no approved questions exist,
// so it must clear the same serve-path floor as approved content (C6).
function testDemoSeedMeetsServeFloor() {
  for (const q of questions) {
    const integrity = validateQuestionIntegrity(q, { requireWhyWrong: true });
    assert.equal(integrity.passed, true, `${q.id} integrity: ${integrity.errors.join("; ")}`);
    const rationale = assessLearnerFriendlyRationale({ rationale: q.rationale, whyWrong: q.whyWrong });
    assert.equal(rationale.passed, true, `${q.id} rationale: ${rationale.issues.join("; ")}`);
  }
}

function run() {
  testDemoSeedQuestionsAvoidCartoonishlyUnsafeDistractors();
  testDemoSeedMeetsServeFloor();
  console.log("demoSeedQuestions tests passed");
}

run();
