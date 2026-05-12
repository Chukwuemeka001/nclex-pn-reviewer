import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assessDistractorPlausibility } from "./distractorQuality.js";

const here = dirname(fileURLToPath(import.meta.url));
const questions = JSON.parse(readFileSync(join(here, "../data/demo_seed_questions.json"), "utf8"));

function testDemoSeedQuestionsAvoidCartoonishlyUnsafeDistractors() {
  const failures = questions
    .map((question) => ({ question, result: assessDistractorPlausibility(question) }))
    .filter(({ result }) => !result.passed);

  assert.deepEqual(failures.map(({ question }) => question.id), []);
}

function run() {
  testDemoSeedQuestionsAvoidCartoonishlyUnsafeDistractors();
  console.log("demoSeedQuestions tests passed");
}

run();
