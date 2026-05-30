#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function fail(message, detail = "") {
  console.error(`[check_served_artifact_fresh] FAIL: ${message}`);
  if (detail) console.error(detail.trim());
  process.exit(1);
}

try {
  const beforeRaw = run("cat src/data/served_questions.json");
  run("node scripts/compile_served_questions.mjs");
  const afterRaw = run("cat src/data/served_questions.json");

  const before = JSON.parse(beforeRaw);
  const after = JSON.parse(afterRaw);

  const normalize = (obj) => ({ ...obj, compiledAt: "__IGNORED__" });
  const beforeNorm = JSON.stringify(normalize(before));
  const afterNorm = JSON.stringify(normalize(after));

  if (beforeNorm !== afterNorm) {
    const diff = run("git --no-pager diff -- src/data/served_questions.json");
    fail("served_questions.json is stale. Run `cd app && npm run compile:served` and commit the artifact.", diff);
  }

  console.log("[check_served_artifact_fresh] PASS: served artifact is fresh.");
} catch (error) {
  const stderr = error?.stderr?.toString?.() || error?.message || String(error);
  fail("Could not complete served artifact freshness check.", stderr);
}
