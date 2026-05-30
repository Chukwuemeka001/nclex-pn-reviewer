#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const statusPath = path.join(repoRoot, 'docs/quality/FIRST10_PROOFPOINT_STATUS.json');

function fail(msg) {
  console.error(`[first10-proofpoint] FAIL: ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`[first10-proofpoint] ${msg}`);
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    fail(`Could not read JSON at ${p}: ${err.message}`);
  }
}

const statusDoc = readJson(statusPath);
const status = statusDoc?.status;

const blockedStatuses = new Set(['hold', 'blocked']);
const isReadyToScale = status === 'ready_to_scale';

if (!status || typeof status !== 'string') {
  fail('Missing required string field: status');
}

if (isReadyToScale) {
  const evidence = statusDoc?.evidence || {};
  const required = [
    'first10_feedback_comparison_completed',
    'comparison_report_path',
    'review_cycle_id',
    'approved_by',
    'approved_at'
  ];

  for (const key of required) {
    if (!(key in evidence)) {
      fail(`status=ready_to_scale requires evidence.${key}`);
    }
  }

  if (evidence.first10_feedback_comparison_completed !== true) {
    fail('status=ready_to_scale requires evidence.first10_feedback_comparison_completed=true');
  }

  for (const key of ['comparison_report_path', 'review_cycle_id', 'approved_by', 'approved_at']) {
    if (typeof evidence[key] !== 'string' || evidence[key].trim() === '') {
      fail(`status=ready_to_scale requires non-empty evidence.${key}`);
    }
  }

  info('PASS: status=ready_to_scale with complete evidence.');
  process.exit(0);
}

// Non-scaling states should not block CI by default. They only block scaling-file changes.
const changedFilesRaw = process.env.PROOFPOINT_CHANGED_FILES || '';
const changedFiles = changedFilesRaw
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

const scalingPathMatchers = [
  /^app\/src\/data\//,
  /^qbank_pipeline\//
];

const scalingExceptions = new Set([
  'app/src/data/served_questions.json'
]);

const hasScalingChanges = changedFiles.some((f) =>
  !scalingExceptions.has(f) && scalingPathMatchers.some((rx) => rx.test(f))
);

if (blockedStatuses.has(status) && hasScalingChanges) {
  fail(`status=${status} blocks scaling changes. Update docs/quality/FIRST10_PROOFPOINT_STATUS.json to ready_to_scale with evidence before changing scaling paths.`);
}

if (blockedStatuses.has(status)) {
  info(`PASS: status=${status}; no scaling-path changes detected.`);
  process.exit(0);
}

if (status === 'ready_for_review') {
  if (hasScalingChanges) {
    fail('status=ready_for_review still blocks scaling-path changes; use ready_to_scale with full evidence.');
  }
  info('PASS: status=ready_for_review; no scaling-path changes detected.');
  process.exit(0);
}

fail(`Unknown status '${status}'. Allowed: hold, blocked, ready_for_review, ready_to_scale.`);
