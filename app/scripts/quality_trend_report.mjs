#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assessLearnerFriendlyRationale } from '../src/lib/learnerFriendlyRationale.js';
import { assessDistractorPlausibility } from '../src/lib/distractorQuality.js';

const appDir = process.cwd();
const repoRoot = path.resolve(appDir, '..');

const first10Path = path.join(appDir, 'src/data/external_review_first10.json');
const reviewEventsPath = path.join(repoRoot, 'qbank_pipeline/review_logs/review_events.json');
const submissionsPath = path.join(repoRoot, 'qbank_pipeline/review_logs/external_review_submissions.jsonl');

const reportsDir = path.join(repoRoot, 'qbank_pipeline/reports/quality_trends');
fs.mkdirSync(reportsDir, { recursive: true });

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

function words(text = '') {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function ratio(num, den) {
  return den > 0 ? Number((num / den).toFixed(4)) : 0;
}

function pct(num, den) {
  return den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

const genericMarkers = [
  'incorrect because',
  'not correct because',
  'not the best',
  'not appropriate',
  'wrong because',
  'not safe because'
];

const items = readJson(first10Path, []);
const reviewEvents = readJson(reviewEventsPath, []);
const submissions = readJsonl(submissionsPath);

const now = new Date();
const generatedAt = now.toISOString();

const statusCounts = {};
const singleAnswerDist = { 0: 0, 1: 0, 2: 0, 3: 0 };
let singleAnswerTotal = 0;

let whyWrongExpected = 0;
let whyWrongFilled = 0;
let whyWrongWordTotal = 0;
let whyWrongGenericHits = 0;

let rationaleWordTotal = 0;
let rationaleGenericHits = 0;

let distractorFlaggedItems = 0;
const distractorIssueCounts = {};

let rationaleFlaggedItems = 0;

for (const item of items) {
  const status = item.reviewStatus || 'unknown';
  statusCounts[status] = (statusCounts[status] || 0) + 1;

  const correct = Array.isArray(item.correctAnswerIndexes) ? item.correctAnswerIndexes : [];
  const choices = Array.isArray(item.answerChoices) ? item.answerChoices : [];

  if (correct.length === 1) {
    singleAnswerTotal += 1;
    const idx = correct[0];
    if (idx in singleAnswerDist) singleAnswerDist[idx] += 1;
  }

  const whyWrong = Array.isArray(item.whyWrong) ? item.whyWrong : [];
  const correctSet = new Set(correct);

  for (let i = 0; i < choices.length; i += 1) {
    if (correctSet.has(i)) continue;
    whyWrongExpected += 1;
    const txt = String(whyWrong[i] || '').trim();
    if (!txt) continue;
    whyWrongFilled += 1;
    whyWrongWordTotal += words(txt);
    const ltxt = txt.toLowerCase();
    if (genericMarkers.some((m) => ltxt.includes(m))) whyWrongGenericHits += 1;
  }

  const rationale = String(item.rationale || '').trim();
  rationaleWordTotal += words(rationale);
  const lr = rationale.toLowerCase();
  if (genericMarkers.some((m) => lr.includes(m))) rationaleGenericHits += 1;

  const d = assessDistractorPlausibility({
    stem: item.stem,
    choices: item.answerChoices,
    correctAnswerIndexes: item.correctAnswerIndexes
  });
  if (!d.passed) {
    distractorFlaggedItems += 1;
    for (const issue of d.issues || []) {
      const key = String(issue).split(':')[0].trim() || 'unknown';
      distractorIssueCounts[key] = (distractorIssueCounts[key] || 0) + 1;
    }
  }

  const r = assessLearnerFriendlyRationale({
    rationale: item.rationale,
    whyWrong: item.whyWrong,
    answerChoices: item.answerChoices,
    correctAnswerIndexes: item.correctAnswerIndexes
  });
  if (!r.passed) rationaleFlaggedItems += 1;
}

const decisionCounts = {};
const submissionsLast7d = { total: 0, pass: 0, reject: 0 };
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

for (const s of submissions) {
  const dec = String(s.decision || 'unknown').toUpperCase();
  decisionCounts[dec] = (decisionCounts[dec] || 0) + 1;

  const ts = s.receivedAt ? new Date(s.receivedAt) : null;
  if (ts && !Number.isNaN(ts.getTime()) && ts >= sevenDaysAgo) {
    submissionsLast7d.total += 1;
    if (dec === 'PASS') submissionsLast7d.pass += 1;
    if (dec === 'REJECT') submissionsLast7d.reject += 1;
  }
}

const reviewEventTypeCounts = {};
for (const e of reviewEvents) {
  const t = String(e.type || 'unknown');
  reviewEventTypeCounts[t] = (reviewEventTypeCounts[t] || 0) + 1;
}

const report = {
  generated_at: generatedAt,
  data_sources: {
    first10: path.relative(repoRoot, first10Path),
    review_events: path.relative(repoRoot, reviewEventsPath),
    submissions_jsonl: path.relative(repoRoot, submissionsPath)
  },
  question_quality_trends: {
    total_items: items.length,
    review_status_counts: statusCounts,
    answer_key_distribution_single_answer: {
      total: singleAnswerTotal,
      index_counts: singleAnswerDist,
      index_pct: {
        '0': pct(singleAnswerDist[0], singleAnswerTotal),
        '1': pct(singleAnswerDist[1], singleAnswerTotal),
        '2': pct(singleAnswerDist[2], singleAnswerTotal),
        '3': pct(singleAnswerDist[3], singleAnswerTotal)
      }
    },
    whywrong_specificity: {
      expected_wrong_slots: whyWrongExpected,
      filled_wrong_slots: whyWrongFilled,
      coverage_pct: pct(whyWrongFilled, whyWrongExpected),
      avg_words_per_filled_wrong: whyWrongFilled > 0 ? Number((whyWrongWordTotal / whyWrongFilled).toFixed(2)) : 0,
      generic_marker_rate_pct: pct(whyWrongGenericHits, whyWrongFilled)
    },
    rationale_quality: {
      avg_words: items.length > 0 ? Number((rationaleWordTotal / items.length).toFixed(2)) : 0,
      generic_marker_rate_pct: pct(rationaleGenericHits, items.length),
      learner_friendly_flag_rate_pct: pct(rationaleFlaggedItems, items.length)
    },
    distractor_plausibility: {
      flagged_item_rate_pct: pct(distractorFlaggedItems, items.length),
      issue_counts: distractorIssueCounts
    }
  },
  reviewer_pipeline_trends: {
    submissions_total: submissions.length,
    submissions_decision_counts: decisionCounts,
    submissions_last_7d: {
      ...submissionsLast7d,
      pass_rate_pct: pct(submissionsLast7d.pass, submissionsLast7d.total)
    },
    review_event_type_counts: reviewEventTypeCounts
  }
};

const stamp = `${toDateStr(now)}_${now.toISOString().slice(11, 19).replace(/:/g, '')}`;
const jsonOut = path.join(reportsDir, `${stamp}.json`);
const latestOut = path.join(reportsDir, 'latest.json');

fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(latestOut, JSON.stringify(report, null, 2) + '\n');

const mdOut = path.join(reportsDir, `${stamp}.md`);
const md = [
  `# Quality Trend Report — ${generatedAt}`,
  '',
  `- total_items: ${report.question_quality_trends.total_items}`,
  `- whywrong_coverage_pct: ${report.question_quality_trends.whywrong_specificity.coverage_pct}`,
  `- whywrong_generic_marker_rate_pct: ${report.question_quality_trends.whywrong_specificity.generic_marker_rate_pct}`,
  `- rationale_flag_rate_pct: ${report.question_quality_trends.rationale_quality.learner_friendly_flag_rate_pct}`,
  `- distractor_flagged_item_rate_pct: ${report.question_quality_trends.distractor_plausibility.flagged_item_rate_pct}`,
  `- submissions_last_7d_pass_rate_pct: ${report.reviewer_pipeline_trends.submissions_last_7d.pass_rate_pct}`,
  '',
  'Top distractor issue buckets:',
  ...Object.entries(distractorIssueCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `- ${k}: ${v}`)
].join('\n');

fs.writeFileSync(mdOut, md + '\n');
fs.writeFileSync(path.join(reportsDir, 'latest.md'), md + '\n');

console.log('[quality_trend_report] wrote:');
console.log(`- ${path.relative(repoRoot, jsonOut)}`);
console.log(`- ${path.relative(repoRoot, mdOut)}`);
console.log(`- ${path.relative(repoRoot, latestOut)}`);
console.log(`- ${path.relative(repoRoot, path.join(reportsDir, 'latest.md'))}`);
