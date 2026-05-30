#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function fail(message, detail = '') {
  console.error(`[check_pages_artifacts_fresh] FAIL: ${message}`);
  if (detail) console.error(detail.trim());
  process.exit(1);
}

try {
  console.log('[check_pages_artifacts_fresh] Rebuilding canonical GitHub Pages bundle...');
  run('node scripts/build_pages.mjs');

  const changed = run('git status --porcelain -- ../index.html ../assets');
  if (changed.trim()) {
    const diff = run('git --no-pager diff -- ../index.html ../assets');
    fail(
      'Committed root Pages artifacts are stale relative to source. Run `cd app && npm run build:pages` and commit index.html/assets.',
      diff
    );
  }

  console.log('[check_pages_artifacts_fresh] PASS: root Pages artifacts are fresh and in sync.');
} catch (err) {
  const stderr = err?.stderr?.toString?.() || err?.message || String(err);
  fail('Could not complete pages freshness check.', stderr);
}
