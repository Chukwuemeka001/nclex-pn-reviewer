import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sanitizeApprovedExports } from "./sanitize_approved_export.mjs";

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function baseApprovedQuestion(overrides = {}) {
  return {
    id: "safe-q1",
    status: "reviewed_approved",
    examProgram: "NCLEX-PN",
    itemType: "multiple_choice",
    stem: "A nurse is caring for a client at risk for falls. Which action is safest?",
    choices: ["Keep the call bell within reach.", "Leave the bed raised.", "Dim all lights.", "Remove non-skid socks."],
    correctAnswerIndexes: [0],
    correctAnswerText: ["Keep the call bell within reach."],
    rationale: "Keeping the call bell within reach supports timely assistance and reduces unsafe attempts to ambulate alone.",
    whyWrong: ["Raised beds increase fall risk.", "Very low lighting can increase risk.", "Non-skid socks reduce slipping."],
    tagging: { clientNeedsCategory: { id: "safe-effective-care-environment", label: "Safe and Effective Care Environment" } },
    difficulty: "easy",
    estimatedTimeSeconds: 60,
    review: {
      status: "reviewed_approved",
      clinicalReviewStatus: "reviewed_passed",
      tagReviewStatus: "reviewed_passed",
      copyrightRiskStatus: "low_risk",
    },
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    ...overrides,
  };
}

async function runTests() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nclex-sanitize-test-"));
  const inputDir = path.join(tmp, "approved_questions");
  const outputDir = path.join(tmp, "public_question_exports");

  await writeJson(path.join(inputDir, "approved.json"), [
    baseApprovedQuestion({
      sourceQuestionId: "private-source-id",
      sourceTracePrivate: { url: "https://private-source.example/question" },
      audit: { sourceUrl: "https://private-source.example/audit" },
      draftWarnings: ["private warning"],
      sourceGroup: { masterSourceUrl: "https://private-source.example/group" },
    }),
  ]);

  const result = await sanitizeApprovedExports({ inputDir, outputDir });
  assert.equal(result.ok, true);
  assert.equal(result.filesWritten, 2);
  assert.equal(result.questionsExported, 1);
  assert.deepEqual(result.unsafeHits, []);

  const exported = await readJson(path.join(outputDir, "approved_public_questions.json"));
  assert.equal(exported.length, 1);
  const item = exported[0];
  assert.equal(item.id, "safe-q1");
  assert.equal(item.review.status, "reviewed_approved");
  assert.equal(item.sourceQuestionId, undefined);
  assert.equal(item.sourceTracePrivate, undefined);
  assert.equal(item.audit, undefined);
  assert.equal(item.draftWarnings, undefined);
  assert.equal(item.sourceGroup, undefined);

  const manifest = await readJson(path.join(outputDir, "manifest.json"));
  assert.equal(manifest.questionsExported, 1);
  assert.equal(manifest.sourceFiles.length, 1);

  await writeJson(path.join(inputDir, "bad.json"), [
    baseApprovedQuestion({ id: "bad-q1", stem: "This leaked Alphaslice source wording." }),
  ]);

  await assert.rejects(
    () => sanitizeApprovedExports({ inputDir, outputDir: path.join(tmp, "bad-output") }),
    /Unsafe approved-question export blocked/
  );
}

runTests()
  .then(() => console.log("sanitize_approved_export tests passed"))
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
