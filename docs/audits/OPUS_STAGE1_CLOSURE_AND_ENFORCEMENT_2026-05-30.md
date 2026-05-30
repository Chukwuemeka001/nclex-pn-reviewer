# Opus Audit Stage 1 — Closure + Enforcement Hardening

Date: 2026-05-30  
Priority lens: **Exam quality credibility first**  
Refactor budget: **Medium refactors allowed when ROI is strong**

---

## 1) Closure Ledger (C1–C7)

Status key:
- CLOSED = implemented + verified
- PARTIAL = implemented but missing enforcement/evidence automation
- OPEN = not implemented

### C1 — Enforce distractor + rationale quality on serve path
- Status: **CLOSED**
- Commits: `4e95e51`, `27acc02`, deployed in `d7e3d97`
- Files:
  - `app/src/lib/questionLoader.js`
  - `app/src/lib/questionLoader.serveGate.test.mjs`
- Verification:
  - `cd app && npm run test:serve-gate` (pass via `npm run test:ci` run on 2026-05-30)
- Residual risk:
  - Gate is strong, but still data-dependent: bad content can enter repo and then be rejected at serve-time. This is acceptable for safety, but noisy for authoring flow.

### C2 — Add CI workflow to enforce quality chain
- Status: **CLOSED**
- Commits: `890dcd5`
- Files:
  - `.github/workflows/quality-gates.yml`
  - `app/package.json` (`test:ci`)
- Verification:
  - Local: `cd app && npm run test:ci` → pass (2026-05-30)
  - Remote: User confirmed Actions green (25 workflows green)
- Residual risk:
  - None critical. Workflow exists and is running.

### C3 — Remove duplicate server integrity validator, delegate to shared lib
- Status: **CLOSED**
- Commits: `1bf3622`
- Files:
  - `app/server/reviewApi.mjs`
  - `app/server/reviewApi.integrity.test.mjs`
- Verification:
  - `cd app && npm run test:server-integrity` (pass via `npm run test:ci`)
- Residual risk:
  - Low. Single source of truth achieved.

### C4 — Critical safety/scope floor (critical <3/4 => reject)
- Status: **CLOSED**
- Commits: `1b71279`, deployed in `d7e3d97`
- Files:
  - `app/src/lib/externalReviewerRubric.js`
  - `app/src/lib/externalReviewerRubric.test.mjs`
- Verification:
  - `cd app && npm run test:external-reviewer` (pass via `npm run test:ci`)
- Residual risk:
  - Low. Hard safety floor enforced.

### C5 — Deploy hardening (scripted build + sync verification)
- Status: **CLOSED**
- Commits: `9de9277`, deployment update `d7e3d97`
- Files:
  - `app/scripts/build_pages.mjs`
  - `app/scripts/verify_dist_sync.mjs`
  - `app/package.json`
- Verification:
  - `cd app && npm run verify:deploy` → pass (2026-05-30)
- Residual risk:
  - Medium operational: process still depends on humans running canonical deploy flow consistently.

### C6 — Strict whyWrong enforcement on serve path + demo backfill
- Status: **CLOSED**
- Commits: `27acc02`, deployed in `d7e3d97`
- Files:
  - `app/src/lib/questionIntegrity.js`
  - `app/src/data/demo_seed_questions.json`
  - `app/src/lib/demoSeedQuestions.test.mjs`
- Verification:
  - `cd app && npm run test:demo-seed` (pass via `npm run test:ci`)
  - `cd app && npm run test:serve-gate` (pass via `npm run test:ci`)
- Residual risk:
  - Low. Constraint enforced at serve path.

### C7 — Expand unsafe distractor pattern coverage + test harness reliability
- Status: **CLOSED**
- Commits: `a82b8bd`
- Files:
  - `app/src/lib/distractorQuality.js`
  - `app/src/lib/distractorQuality.test.mjs`
  - `app/src/lib/learnerFriendlyRationale.test.mjs`
- Verification:
  - `cd app && npm run test:nclex-quality-gates` (pass via `npm run test:ci`)
- Residual risk:
  - Medium (known class): regex-based guardrails can miss novel evasions and overflag edge cases.

---

## 2) Evidence Snapshot (Current)

- Branch state: `main` synced with `origin/main` (`git status -sb` clean)
- Local CI: `cd app && npm run test:ci` **PASS** (2026-05-30)
- Deploy consistency: `cd app && npm run verify:deploy` **PASS** (2026-05-30)
- GitHub Actions: user-confirmed green runs

Conclusion: **All C1–C7 remediation objectives are closed as implemented controls.**

---

## 3) Gap Map (Out of C1–C7 scope, still relevant)

Exam-quality-first gaps still open:

1) First-10 proof-point policy is procedural, not enforced
- Current: documented expectation
- Gap: no machine gate blocks scaling when evidence is missing
- Risk: quality drift can resume under throughput pressure

2) Submission transport reliability still operationally fragile
- Current: functional, but historical tunnel churn risk exists
- Gap: reliability control not encoded as a formal SLO check
- Risk: reviewers hit intermittent submit failures; feedback loop degrades

3) Quality telemetry is pass/fail heavy, not trend-aware
- Current: gates pass/fail
- Gap: no rolling trend metrics (e.g., whyWrong specificity score distribution, distractor-flag rates by domain)
- Risk: quality can erode slowly without tripping hard failures

---

## 4) Enforcement Hardening Plan (Exam quality credibility first)

## P0 (do now)

### P0.1 Add explicit “proof-point gate” artifact and CI check
- Objective: block content-scaling merges without first-10 evidence refresh.
- Change:
  - Add required file: `docs/quality/FIRST10_PROOFPOINT_STATUS.json`
  - Add checker: `app/scripts/check_first10_proofpoint.mjs`
  - Wire into `test:ci` before quality gates.
- Rule example:
  - `status: "ready_to_scale"` only if required evidence fields are current and signed-off.
- ROI: High. Converts tribal policy into enforceable quality governance.

### P0.2 Add deploy-path single command and policy
- Objective: remove manual deploy ambiguity.
- Change:
  - Canonical script alias in root docs: `cd app && npm run build:pages && npm run verify:deploy`
  - Add CI or pre-push warning if root `index.html/assets` out of sync after build changes.
- ROI: High. Prevents silent stale-bundle regressions.

## P1 (next)

### P1.1 Add quality trend reporter (medium refactor, high credibility ROI)
- Objective: detect slow quality decay before hard failures.
- Change:
  - New script: `app/scripts/quality_trend_report.mjs`
  - Outputs JSON/MD summary for:
    - whyWrong non-genericity markers
    - distractor unsafe-flag frequency by domain
    - answer-key distribution trend
  - Store at `qbank_pipeline/reports/quality_trends/*.json`
- ROI: Strong for exam credibility; supports targeted rewrites.

### P1.2 Reviewer submission reliability health check
- Objective: keep external-review ingestion trustworthy.
- Change:
  - Add lightweight health probe script + expected response assertions
  - Include in ops checklist before review waves
- ROI: Medium-high. Protects review data pipeline.

## P2 (after)

### P2.1 Move regex-only distractor safety toward layered checks
- Objective: reduce false negatives/false positives over time.
- Change:
  - Keep regex floor, add structured heuristic layer (context + action/agent parsing)
- ROI: Medium. Good improvement but not immediate blocker.

---

## 5) Recommended Next Actions (ordered)

1. Implement **P0.1 proof-point gate** first (highest exam-credibility control).
2. Implement **P0.2 deploy-path policy hardening** second.
3. Implement **P1.1 trend reporter** third (medium refactor, high signal).
4. Then run a fresh quality review cycle and compare trend baseline pre/post changes.

---

## 6) Decision for Stage 2 (Greenfield Re-plan)

When running Stage 2 (VisualPRD-style from scratch), lock this framing:
- Quality credibility is the top optimization target, not throughput.
- Any greenfield architecture must preserve C1–C7 invariants as non-negotiable constraints.
- Output must include Keep/Change/Remove matrix against current repo.
