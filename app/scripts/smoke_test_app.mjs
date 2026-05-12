import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "..");

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkFetch(url, label) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(`${label} failed: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

function normalizeApproved(value) {
  return Array.isArray(value) ? value.filter((item) => item && (item.status === "reviewed_approved" || item.reviewStatus === "reviewed_approved")) : [];
}

async function main() {
  const requiredFiles = [
    "src/main.jsx",
    "src/App.jsx",
    "src/ErrorBoundary.jsx",
    "src/lib/questionLoader.js",
    "src/pages/AdminReview.jsx",
    "src/data/demo_seed_questions.json",
    "server/reviewApi.mjs",
    "vite.config.js",
  ];
  const missing = [];
  for (const rel of requiredFiles) {
    if (!await exists(path.join(appRoot, rel))) missing.push(rel);
  }
  if (missing.length) throw new Error(`Missing app source files: ${missing.join(", ")}`);

  const demo = await readJson(path.join(appRoot, "src/data/demo_seed_questions.json"));
  if (!Array.isArray(demo) || demo.length === 0) throw new Error("demo_seed_questions.json did not load as a non-empty array.");

  const tagIndex = await readJson(path.join(repoRoot, "qbank_pipeline/tag_index.json"));
  if (!tagIndex || !tagIndex.clientNeedsCategory || !tagIndex.questionType) throw new Error("tag_index.json missing expected groups.");

  const approvedDir = path.join(repoRoot, "qbank_pipeline/approved_questions");
  const approvedFiles = (await fs.readdir(approvedDir).catch(() => [])).filter((name) => name.endsWith(".json"));
  let approvedCount = 0;
  for (const name of approvedFiles) {
    approvedCount += normalizeApproved(await readJson(path.join(approvedDir, name), [])).length;
  }
  const wouldUseDemoFallback = approvedCount === 0;
  if (wouldUseDemoFallback && demo.length === 0) throw new Error("Approved questions are empty and demo fallback is unavailable.");

  const health = await checkFetch("http://127.0.0.1:5174/health", "Review API /health");
  const root = await checkFetch("http://127.0.0.1:5174/", "Review API /");
  if (!Array.isArray(root.availableRoutes) || !root.availableRoutes.includes("GET /api/review/state")) {
    throw new Error("Review API root does not list expected routes.");
  }

  return {
    ok: true,
    checkedFiles: requiredFiles.length,
    demoQuestions: demo.length,
    approvedFiles: approvedFiles.length,
    approvedQuestions: approvedCount,
    wouldUseDemoFallback,
    tagGroups: Object.keys(tagIndex).length,
    health,
    apiService: root.service,
  };
}

main()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
