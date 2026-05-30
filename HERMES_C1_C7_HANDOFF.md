# Hermes Handoff — Integrity Audit Remediation C1–C7

Date: 2026-05-30
Author: Claude Opus (Claude Code), executing Hermes-approved plan
Scope: NCLEX-PN trainer repo (`/Users/emeka/Code/2026-05-02/hey-codex-browser-plugin-browser-use`)
Status: **All 7 slices (C1–C7) committed on `main`, live Pages bundle rebuilt. PUSH BLOCKED on token scope — nothing is on remote yet.**

Update (2026-05-30, same session): Emeka approved the §6 open items. I then (a) rebuilt and committed
the live GitHub Pages bundle (`d7e3d97`) so C1/C4 are built into the served assets, and (b) committed
this handoff note + `docs/prompts/`. **The `git push` was REJECTED** because the stored Personal Access
Token lacks the `workflow` scope required to push the C2 commit that adds
`.github/workflows/quality-gates.yml`. All commits are safe locally; remote is unchanged.

**HANDOFF TO HERMES:** Emeka has assigned the verify + push to Hermes. Hermes: confirm the local
commits, fix the token scope, run `git push origin main`, then confirm CI goes green. Full steps in
§6.1.

---

## 0. TL;DR for Hermes

The integrity audit (`docs/prompts/opus-nclex-generation-integrity-audit.md`) found four critical gaps:
no CI, the serve path was only running integrity (not distractor/rationale gates), the deploy path
was manual/drift-prone, and the server had a duplicate integrity validator that could drift from the
shared lib. Plus two safety/quality holes: the external-reviewer rubric could "salvage" a question
with a critical-criterion score of 2/4, and distractor pattern coverage + test wiring let unsafe
content and silent test failures slip through.

All of that is now closed across 7 commits. Every change is covered by a test, and the full gate
chain (`npm run test:nclex-quality-gates`) is green. The CI workflow runs that chain plus a build and
a deploy-sync check on every push to `main` and every PR.

**Two things still need a human decision (see §6):**
1. Whether to `git push` these 7 commits to the remote (I did not push — shared-state action).
2. The live GitHub Pages site still serves the OLD bundle. The C1/C4 frontend logic changes are
   committed in source but NOT built into the deployed `index.html`/`assets`. Shipping them requires
   `npm run build:pages` + a commit (see §6.2).

---

## 1. Commit map (newest last)

```
9de9277 C5: encode the GitHub Pages deploy as scripts + CI sync check
1b71279 C4: critical safety/scope floor — any critical below 3/4 is REJECT
1bf3622 C3: remove duplicate server integrity validator; delegate to shared lib
890dcd5 C2: add CI workflow enforcing the quality-gate chain
4e95e51 C1: enforce distractor + rationale quality gates on the serve path
27acc02 C6: strict whyWrong mode on serve path + demo seed backfill
a82b8bd C7: expand distractor unsafe patterns + convert tests to node:test
```

Note the on-disk order: C1–C5 were committed first (the "highest risk reducers + deploy hardening"
batch Emeka asked for), then C6 and C7. Each slice is a clean, independently revertable commit.

`docs/prompts/` is still untracked (it holds the audit prompt I was told to follow). I left it
untracked — it is not part of the remediation. Add it separately if you want it versioned.

---

## 2. What each slice changed and WHY

### C1 — serve-path quality gates (commit 4e95e51)
**Why:** The serve path (`app/src/lib/questionLoader.js`) was the biggest gap. It only ran
`validateQuestionIntegrity`. Distractor plausibility and learner-friendly rationale were enforced in
review tooling but NOT when a question was actually served to a learner — so a low-quality item that
slipped past review (or a demo-pool item) could still reach a student.

**Changes:**
- `app/src/lib/questionLoader.js`: imported `validateQuestionIntegrity`, `assessDistractorPlausibility`,
  `assessLearnerFriendlyRationale` at top of file (removed a mid-file import). In
  `normalizeQuestion(raw, source="approved")` it now runs integrity + distractor + learner-rationale
  gates and THROWS on failure for all sources.
- NEW `app/src/lib/questionLoader.serveGate.test.mjs`: mirrors the loader's gate logic (cannot import
  `questionLoader.js` directly because it references `import.meta.env` from Vite). Tests the demo pool,
  the approved-alpha items (filtered from `external_review_first10.json`), and synthetic bad cases.
- `app/package.json`: added `test:serve-gate` script and wired it into the gate chain.

### C2 — CI workflow (commit 890dcd5)
**Why:** There was no automated enforcement. Anyone could merge a regression. The gates only ran if
someone remembered to run them locally.

**Changes:**
- NEW `.github/workflows/quality-gates.yml`: runs on `push: main` and `pull_request`.
  `working-directory: app`, `VITE_BASE_PATH=/nclex-pn-reviewer/`, Node 18, `npm ci`,
  `npm run test:ci`, then `npm run verify:deploy`.
- `app/package.json`: added `test:ci` = `npm run build && npm run test:nclex-quality-gates`.
- **Verified** Node 18.16 `node:test` propagates a failing test as process exit 1 (I ran a synthetic
  failing test to confirm CI will actually go red — this is the whole point of C7's test conversion too).

### C3 — remove duplicate server validator (commit 1bf3622)
**Why:** `app/server/reviewApi.mjs` had its own ~45-line `validateQuestionIntegrity` that duplicated
the shared lib. Two copies = drift risk: the review API could accept/reject differently than the serve
path. Single source of truth eliminates that class of bug.

**Changes:**
- `app/server/reviewApi.mjs`: imports `validateQuestionIntegrity as libValidateQuestionIntegrity` from
  `../src/lib/questionIntegrity.js`. The local function is now a thin adapter that preserves the
  server's field precedence (`choicesFromItem` + `normalizeTextArray` — so rewritten drafts validate
  against `newAnswerChoices`, not stale originals) and maps lib errors into the server's
  `{code:"QUESTION_INTEGRITY", message}` shape. Exposes `export { validateQuestionIntegrity, choicesFromItem }`.
- Wrapped the HTTP listener in a main-module guard
  (`const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])`)
  so the module can be imported by tests without booting a server.
- NEW `app/server/reviewApi.integrity.test.mjs`: covers mismatch detection, canonical pair,
  `newAnswerChoices` precedence for rewritten drafts, and out-of-range index.
- **Verified** the frontend (`app/src`) does NOT consume the server's structured `integrityIssues`
  shape, so the adapter swap is safe (no caller depends on the old internal format).

### C4 — critical safety floor (commit 1b71279)
**Why:** `scoreExternalReview` in `app/src/lib/externalReviewerRubric.js` had a "salvage" branch: a
question could score 2/4 on a CRITICAL criterion (e.g. clinical safety) and still pass if the total
was high enough. For a nursing exam trainer that is exactly backwards — a critical safety/scope failure
must be a hard reject regardless of how good the rest of the item is.

**Changes:**
- Replaced the two-branch logic with a single hard rule: `if (criterion.critical && normalized < 3)`
  push a blocker `"<label> scored below 3/4: reject-level safety/scope issue."`. Removed the
  `else if (blockers.length > 0 && total >= 18 && !blockers.some(...))` salvage path entirely.
- `externalReviewerRubric.test.mjs`: added `testCriticalSafetyAtTwoIsRejectNotFix` (clinicalSafety=2,
  others high → total 22 → decision REJECT) and registered it in `run()`.

### C5 — deploy hardening (commit 9de9277)
**Why:** The GitHub Pages deploy was manual: build `app/dist`, hand-copy into repo root, hope the
asset references stayed consistent. Easy to ship a root `index.html` that points at assets that no
longer exist. The audit flagged this as a silent-breakage risk.

**Changes (tooling only — does NOT change what's currently deployed):**
- NEW `app/scripts/build_pages.mjs`: builds with `VITE_BASE_PATH`, copies `dist`→repo root, rebuilds
  root `assets/`, runs the verify check.
- NEW `app/scripts/verify_dist_sync.mjs`: asserts every `/assets/` reference in the root `index.html`
  exists at the repo root; base-path agnostic; exits 1 on drift.
- `app/package.json`: added `build:pages` and `verify:deploy` scripts.
- I ran `build_pages` to confirm it works, then restored the committed (stale-but-internally-consistent)
  deploy artifact via `git checkout -- index.html assets` + removed the untracked new bundle. **So C5
  added the tooling but intentionally did not re-deploy.** See §6.2.

### C6 — strict whyWrong + demo backfill (commit 27acc02)
**Why:** "Why each wrong answer is wrong" is core teaching value. The integrity validator only checked
`whyWrong` length when it happened to be provided; it didn't REQUIRE per-option teaching. And the demo
seed pool (the fallback served when no approved questions exist) was exempt from the rationale/whyWrong
floor — meaning the fallback could be lower quality than approved content.

**Changes:**
- `app/src/lib/questionIntegrity.js`: `validateQuestionIntegrity(raw, { strictItemType=false, requireWhyWrong=false })`.
  New strict branch (`requireWhyWrong`): errors if `whyWrong` is empty, length-mismatched, non-blank at
  a correct index, or blank at a wrong index. Non-strict branch preserves prior behavior. Added
  `correctSet` to drive the blank-at-correct / filled-at-wrong logic (handles SATA correctly).
- `app/src/lib/questionLoader.js` (serve path): integrity call now uses `{ requireWhyWrong: true }`,
  and the distractor + learner-rationale gates apply uniformly to ALL sources (C1 had temporarily
  exempted demo; C6 removes that exemption now that demo is backfilled).
- `app/src/data/demo_seed_questions.json`: backfilled `whyWrong` for all 3 items — blank at correct
  index, option-specific teaching at each wrong index. `demo-q-002` is SATA (correct [0,1,3]) so blanks
  at 0/1/3 and explanations at 2/4. Strengthened `demo-q-003` rationale with teaching-signal language
  (hand grips carry body weight; axillary pressure → nerve injury; rubber tips prevent slipping).
- `app/src/lib/demoSeedQuestions.test.mjs`: added `testDemoSeedMeetsServeFloor()` (integrity
  `requireWhyWrong` + learner-rationale) and registered it.
- `app/src/lib/questionIntegrity.test.mjs`: 3 new node:test cases (rejects empty whyWrong; rejects
  blank-wrong + non-blank-correct; accepts SATA blank-at-correct/filled-at-wrong).
- `app/src/lib/questionLoader.serveGate.test.mjs`: made `serveGate(item)` uniform across sources and
  added a missing-whyWrong rejection test.
- `app/package.json`: wired `test:demo-seed` into the gate chain.

### C7 — distractor pattern expansion + test cleanup (commit a82b8bd)
**Why:** Two problems. (a) The cartoonish-unsafe distractor detector had only 6 regex patterns and
real evasions slipped through (reuse needle, skip hand hygiene, self-double a dose, etc.) — these make
items feel AI-generated rather than NCLEX-plausible. (b) `distractorQuality.test.mjs` and
`learnerFriendlyRationale.test.mjs` used a `run()` + `console.log("...passed")` structure that exits 0
even when an assertion throws inside an unguarded call path — meaning a broken gate could pass CI
silently. That directly undermines C2.

**Changes:**
- `app/src/lib/distractorQuality.js`: expanded `CARTOON_UNSAFE_PATTERNS` from 6 to 15 patterns
  (added: prescription wording, expanded ignore-list, leave client unattended, double/increase dose
  on your own, stop/withhold prescribed medication, tell client to stop taking, reuse needle/syringe/
  glove, recap used needle, provide care without washing hands / without hand hygiene, skip
  assessment/vitals/hand hygiene/verification/safety check/time-out). Two patterns were tuned during
  verification to allow intervening adjectives:
    - `reuse (the |a |an )?(same |used |dirty )?(needle|syringe|glove)` — "reuse the **same** needle"
    - `(double|triple|increase) the (dose|dosage|rate)( of \w+)? (without|on your own|independently)` —
      "double the dose **of insulin** on your own"
- `app/src/lib/distractorQuality.test.mjs`: converted to `node:test`. Kept the 4 original tests, added
  "flags expanded cartoonish-unsafe evasions" (8 evasion strings) and "does not flag legitimate
  ordered/scope-appropriate actions" (guards against false positives on `as ordered`, `after checking
  the order`, etc.).
- `app/src/lib/learnerFriendlyRationale.test.mjs`: converted from `run()`+console.log to `node:test`,
  preserving all 5 original assertions.

---

## 3. Verification state

Last full run before this note: `npm run test:nclex-quality-gates` → **GATE_EXIT=0** (all green).

Chain (`app/package.json` → `test:nclex-quality-gates`):
```
test:first10-quality → test:answer-key-distribution → questionIntegrity.test.mjs →
learnerFriendlyRationale.test.mjs → distractorQuality.test.mjs → test:demo-seed →
test:serve-gate → test:server-integrity → test:external-reviewer
```
CI (`test:ci`) wraps that with `npm run build` in front and `npm run verify:deploy` after.

To re-verify from a clean state:
```
cd app && npm ci && npm run test:ci && npm run verify:deploy
```

---

## 4. Errors hit during execution (and how I handled them)

- **zsh `${PIPESTATUS[0]}` empty:** zsh uses 1-indexed `${pipestatus[1]}`. Switched to that / `$?`.
  No functional impact — just how I read exit codes.
- **macOS `timeout` missing:** used a background process + sleep + curl + kill to confirm the review
  server still boots after the C3 main-module guard.
- **Two C7 regex misses during verification:** "reuse the same needle" and "double the dose of insulin
  on your own" failed first run because adjectives sat between the verb and the noun. Fixed both
  patterns (see §2 C7) and re-ran to green. This is exactly the kind of evasion the expansion targets.

---

## 5. Things I deliberately did NOT do (no scope creep)

- Did not re-deploy the live site (C5 is tooling only — see §6.2).
- Did not push to remote (see §6.1).
- Did not touch question content beyond the 3 demo-seed items required by C6.
- Did not add execution/automation features anywhere.
- Left `docs/prompts/` untracked.

---

## 6. OPEN ITEMS — RESOLVED (as-completed record)

### 6.1 Push to remote — HERMES OWNS THIS (verify + push)
Emeka has delegated this to Hermes: **Hermes verifies the local commits, fixes the token scope, and
runs the push.** All 10 commits are ready on local `main` (ahead of `origin/main`); nothing is on
remote yet. Suggested verify-before-push: `cd app && npm ci && npm run test:ci && npm run verify:deploy`
should be green, then push.

`git push origin main` was rejected:
```
! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or
  update workflow `.github/workflows/quality-gates.yml` without `workflow` scope)
```
The stored HTTPS credential is a PAT without the `workflow` scope, and the C2 commit (`890dcd5`) adds a
workflow file. `gh` is not logged in and the SSH key is not registered with GitHub, so HTTPS+PAT is the
only working channel. Remote is at `https://github.com/Chukwuemeka001/nclex-pn-reviewer.git`.

Fix (any one):
- Update/regenerate the PAT to include the `workflow` scope (classic token: check `workflow`;
  fine-grained: grant Workflows read/write on this repo), update the stored credential, then:
  `git push origin main`
- Or `gh auth login` with a token/browser that has `workflow` scope (sets up the git credential
  helper), then `git push origin main`.

After it pushes, the C2 `quality-gates` workflow fires on `push: main` — confirm green in the Actions
tab. If CI is red but local is green, the usual cause is a Node-version or `npm ci` (lockfile)
difference in the runner.

### 6.2 Live site bundle — DONE (commit d7e3d97)
Rebuilt the deployed `index.html` + `assets/` via `npm run build:pages` (VITE_BASE_PATH=
/nclex-pn-reviewer/, verify passed: 2 referenced assets present). The live site now serves the C1
serve-path gates and the C4 reject-floor. JS bundle hash changed
`index-DcNO1fp6.js` → `index-C4CWRJsm.js`; CSS hash unchanged.

### 6.3 Proof-point reminder (from CLAUDE.md standing constraints)
Do not scale NCLEX content before the first-10 feedback comparison. These slices are quality-floor
infrastructure, not content scaling — consistent with that constraint. Keep content additions gated on
first-10 feedback.

---

## 7. File-by-file index (for fast grep)

Source (logic) changes:
- `app/src/lib/questionLoader.js` — C1, C6 (serve-path gates, requireWhyWrong)
- `app/src/lib/questionIntegrity.js` — C6 (strict whyWrong branch)
- `app/src/lib/externalReviewerRubric.js` — C4 (critical floor)
- `app/server/reviewApi.mjs` — C3 (delegate to lib + main guard)
- `app/src/lib/distractorQuality.js` — C7 (15 patterns)
- `app/src/data/demo_seed_questions.json` — C6 (whyWrong backfill)

Tests (new):
- `app/src/lib/questionLoader.serveGate.test.mjs` — C1/C6
- `app/server/reviewApi.integrity.test.mjs` — C3

Tests (modified):
- `app/src/lib/questionIntegrity.test.mjs` — C6
- `app/src/lib/externalReviewerRubric.test.mjs` — C4
- `app/src/lib/demoSeedQuestions.test.mjs` — C6
- `app/src/lib/distractorQuality.test.mjs` — C7 (node:test conversion)
- `app/src/lib/learnerFriendlyRationale.test.mjs` — C7 (node:test conversion)

Tooling / CI:
- `.github/workflows/quality-gates.yml` — C2/C5
- `app/scripts/build_pages.mjs` — C5
- `app/scripts/verify_dist_sync.mjs` — C5
- `app/package.json` — scripts across C1/C2/C3/C5/C6
