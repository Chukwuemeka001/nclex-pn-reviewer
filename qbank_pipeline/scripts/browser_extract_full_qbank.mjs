import fs from "node:fs/promises";
import path from "node:path";
import { runRiseQbankExtractor } from "../../rise_qbank_extractor.mjs";

const PIPELINE_ROOT = "/Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/qbank_pipeline";
const SOURCE_RAW_DIR = path.join(PIPELINE_ROOT, "source_raw");
const MANIFEST_PATH = path.join(PIPELINE_ROOT, "manifests", "qbank_manifest.json");

function slugify(value) {
  return String(value || "quiz")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "quiz";
}

function titleFromLine(line) {
  return String(line || "")
    .replace(/^For\s+/i, "")
    .replace(/,\s*click here\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function discoverRiseQuizLinks(tab) {
  const snapshot = await tab.playwright.domSnapshot();
  const links = [];
  const lines = snapshot.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const urlMatch = lines[index].match(/\/url:\s*(https:\/\/rise\.articulate\.com\/share\/[^\s"]+)/);
    if (!urlMatch) continue;

    let title = "";
    for (let cursor = index - 1; cursor >= 0 && cursor >= index - 8; cursor -= 1) {
      const paragraph = lines[cursor].match(/- text: (.+)$/) || lines[cursor].match(/- paragraph: (.+)$/);
      if (paragraph) {
        title = titleFromLine(paragraph[1].replace(/^"|"$/g, ""));
        break;
      }
    }

    const url = urlMatch[1];
    if (!links.some((link) => link.url === url)) {
      links.push({
        title: title || `Rise quiz ${links.length + 1}`,
        slug: slugify(title || `rise-quiz-${links.length + 1}`),
        url,
      });
    }
  }

  return links;
}

export async function writeDiscoveredManifest(tab, manifestPath = MANIFEST_PATH) {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const quizzes = await discoverRiseQuizLinks(tab);
  const manifest = {
    createdAt: new Date().toISOString(),
    note: "Private manifest for source extraction. Do not publish source URLs or raw extracted content.",
    quizzes,
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

async function ensureQuizStarted(tab, quizUrl) {
  await tab.goto(quizUrl);
  await tab.playwright.waitForLoadState({ state: "load", timeoutMs: 30000 }).catch(() => {});
  let snapshot = await tab.playwright.domSnapshot();

  if (snapshot.includes("START Test")) {
    const startTest = tab.playwright.getByRole("link", { name: "START Test", exact: true });
    if ((await startTest.count()) === 1) {
      await tab.playwright.expectNavigation(() => startTest.click({}), { timeoutMs: 30000, waitUntil: "load" });
    }
  }

  snapshot = await tab.playwright.domSnapshot();
  if (snapshot.includes("START QUIZ")) {
    const startQuiz = tab.playwright.getByRole("button", { name: "START QUIZ", exact: true });
    if ((await startQuiz.count()) === 1) await startQuiz.click({});
  }
}

export async function extractQuiz(tab, quiz, options = {}) {
  await fs.mkdir(SOURCE_RAW_DIR, { recursive: true });
  await ensureQuizStarted(tab, quiz.url);

  const slug = quiz.slug || slugify(quiz.title);
  return runRiseQbankExtractor({
    tab,
    maxQuestions: options.maxQuestions ?? 500,
    outDir: SOURCE_RAW_DIR,
    jsonFilename: `${slug}_raw.json`,
    csvFilename: `${slug}_summary.csv`,
    warningsFilename: `${slug}_warnings.json`,
  });
}

export async function extractFromManifest(tab, options = {}) {
  const manifest = options.manifest || await readJsonIfExists(options.manifestPath || MANIFEST_PATH, null);
  if (!manifest || !Array.isArray(manifest.quizzes)) {
    throw new Error(`Missing manifest with quizzes at ${options.manifestPath || MANIFEST_PATH}`);
  }

  const startAt = options.startAtSlug;
  const selected = startAt
    ? manifest.quizzes.slice(Math.max(0, manifest.quizzes.findIndex((quiz) => quiz.slug === startAt)))
    : manifest.quizzes;

  const results = [];
  for (const quiz of selected) {
    const quizTab = await agent.browser.tabs.new();
    const result = await extractQuiz(quizTab, quiz, options);
    results.push({ quiz, result });
  }
  return results;
}

export { MANIFEST_PATH, SOURCE_RAW_DIR, slugify };
