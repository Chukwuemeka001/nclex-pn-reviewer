# NCLEX Source Registry, Daily Plan, and Rewrite Admin Integration Implementation Plan

> **For Hermes:** Use test-driven-development. For larger subtasks, use subagent-driven-development only after the first local implementation path is clear.

**Goal:** Move the NCLEX-PN app from a safe prototype into a reviewable daily-trainer workflow: safe source registry, daily study plan, Rewrite Lab to AdminReview integration, attribution/provenance, better persistence, and a 50-question review path.

**Architecture:** Keep public app behavior separate from private qbank artifacts. Source/license data lives in `qbank_pipeline/source_registry.json` and validation scripts. Student workflow stays in React/localStorage for now. Review workflow uses the existing local review API and private ignored review artifacts. No leaked/proprietary content enters app data.

**Tech Stack:** React/Vite, Node ESM scripts/tests, local JSON files, localStorage, existing review API.

---

## Daily work rhythm

1. Build one vertical slice at a time.
2. Write failing tests first.
3. Implement minimal code.
4. Run targeted tests.
5. Run full verification when slice is complete.
6. Reevaluate:
   - Did this improve the actual product edge?
   - Did it increase content/legal/clinical risk?
   - Is manual reviewer workload lower or higher?
   - Is the next step still correct?
7. Commit only after tests pass.
8. Update `HERMES_NCLEX_CONTEXT.md` after meaningful changes.

## Safety rules

- Hard reject leaked NCLEX, brain dumps, recall dumps, paid qbank screenshots/PDFs, and competitor-derived items.
- Official NCSBN/NCLEX resources are framework references and links, not copied product content.
- OER/public-domain sources can inform concepts/remediation only when license/attribution is tracked.
- Human clinical review remains required before approval.

---

## Task 1: Source registry foundation

**Objective:** Create a machine-readable source registry so safe/free/open resources can guide content without copying unsafe material.

**Files:**
- Create: `qbank_pipeline/source_registry.json`
- Create: `qbank_pipeline/scripts/source_registry.mjs`
- Create: `qbank_pipeline/scripts/source_registry.test.mjs`
- Modify: `qbank_pipeline/README.md`
- Modify: `NCLEX_FREE_SAFE_SOURCE_STRATEGY.md`

**Behavior:**
- Registry entries include:
  - `sourceId`
  - `title`
  - `url`
  - `sourceType`
  - `license`
  - `allowedUse`
  - `prohibitedUse`
  - `attributionRequired`
  - `attributionText`
  - `checkedAt`
  - `status`
  - `notes`
- Validator fails if required fields are missing.
- Validator fails if a source is marked safe but prohibited use includes proprietary/leaked risk indicators.
- Validator outputs source counts by type/status/license.

**Verification:**
```bash
node qbank_pipeline/scripts/source_registry.test.mjs
node qbank_pipeline/scripts/source_registry.mjs --validate
```

**Reevaluation gate:**
Continue only if registry makes safe source use more explicit and does not tempt direct copying.

---

## Task 2: Daily Plan screen

**Objective:** Add a student-facing daily plan that turns error journal + weak areas + user constraints into a small actionable plan.

**Files:**
- Create: `app/src/lib/dailyPlan.js`
- Create: `app/src/lib/dailyPlan.test.mjs`
- Create: `app/src/pages/DailyPlan.jsx`
- Modify: `app/src/App.jsx`
- Modify: `app/package.json`
- Optional style updates: `app/src/styles/app.css`

**Behavior:**
- Inputs:
  - exam date
  - daily minutes
  - journal entries
  - last result weak areas
  - confidence/anxiety rating
- Output:
  - question target
  - remediation tasks
  - one PN safety/delegation drill
  - one rationale review task
  - warning if no journal data exists
- Store preferences locally.

**Verification:**
```bash
cd app && npm run test:daily-plan
cd app && npm run build
```

**Reevaluation gate:**
Continue only if daily plan makes the app more useful even for students who already use UWorld/Archer/Bootcamp.

---

## Task 3: Rewrite Lab to AdminReview/review API integration

**Objective:** Remove manual copy/paste by letting an accepted Rewrite Lab result update the private draft through the local review API.

**Files:**
- Modify: `app/server/reviewApi.mjs`
- Modify: `app/src/lib/rewriteWorkbench.js`
- Modify: `app/src/lib/rewriteWorkbench.test.mjs`
- Modify: `app/src/pages/RewriteWorkbench.jsx`
- Add/modify server tests if existing pattern supports it.

**Behavior:**
- Add API endpoint, likely:
  - `POST /api/review/items/:id/apply-rewrite`
- Endpoint accepts:
  - `rewrittenFields`
  - `allowedRewriteFields`
  - `reviewerName`
  - `reviewerNote`
  - `sourceSafetyStatement`
  - `changeSummary`
- Server checks:
  - item exists
  - only allowed fields are changed
  - locked fields stay locked
  - reviewer note exists
  - review status is set back to needs review / not auto-approved
- Server logs model-assisted rewrite audit locally/private.

**Verification:**
```bash
cd app && npm run test:rewrite
cd app && npm run build
```

Manual smoke:
```bash
cd app && npm run review-api
cd app && npm run dev
```
Then open Rewrite Lab and apply to a draft.

**Reevaluation gate:**
Continue only if integration reduces reviewer effort without weakening human approval.

---

## Task 4: Attribution/provenance fields

**Objective:** Attach source-registry references to question drafts/approved questions without leaking private source text.

**Files:**
- Modify: sanitizer tests/script
- Modify: review API approval validation
- Modify: AdminReview source panel
- Modify: source registry docs

**Behavior:**
- Drafts may include `sourceConceptRefs` referencing registry source IDs.
- Public exports may include safe attribution if needed, but never private source traces.
- Sanitizer strips raw source traces but preserves safe attribution metadata only when explicitly public-safe.

**Verification:**
```bash
node qbank_pipeline/scripts/sanitize_approved_export.test.mjs
cd app && npm run build
```

**Reevaluation gate:**
Continue only if provenance supports safe content generation and does not leak source-derived structures.

---

## Task 5: Persistence path before beta

**Objective:** Decide and implement the next persistence step after localStorage.

**Initial recommendation:** Keep localStorage for prototype; add import/export JSON backup before database. Database comes after UX proves useful.

**Files:**
- Modify: `app/src/lib/errorJournal.js`
- Modify: `app/src/pages/ErrorJournal.jsx`
- Add tests.

**Behavior:**
- Export journal JSON.
- Import journal JSON with validation.
- Warn user this is local prototype storage.

**Reevaluation gate:**
Move to SQLite/Supabase/Firebase only after daily plan + journal prove product value.

---

## Task 6: 50-question review flow

**Objective:** Make it easy for Emeka to review only the necessary content, not live in the app all day.

**Files:**
- Existing improvement loop/admin review files.
- Potential new reviewer checklist doc.

**Behavior:**
- Generate 10-question model-assisted improvement pack.
- Apply rewrites through API.
- Re-score.
- Move toward 50 excellent questions in batches of 10.
- Emeka reviews only items that pass automated safety + quality triage.

**Review link goal:**
When ready, run local services and provide:
- Student app: `http://localhost:5173`
- Review API: `http://localhost:5174` or configured local API port
- Routes:
  - `/rewrite`
  - `/admin`
  - `/journal`
  - `/daily-plan`

---

## Dedicated workspace / agent capacity recommendation

A separate macOS user is optional, not required right now.

Better immediate setup:
1. Keep this repo as the dedicated workspace.
2. Use git commits/checkpoints after every vertical slice.
3. Use `HERMES_NCLEX_CONTEXT.md` as durable memory.
4. Enable only needed tools/secrets.
5. Do not give unrestricted secret access.
6. If running long builds/agents, use Hermes profiles or git worktree mode later.

Potential later setup:
- Create a separate macOS user or project folder only if this grows into multiple repos/services/secrets.
- Use a separate browser profile for product research/testing.
- Use a staging database with fake data.
- Use separate API keys with spending limits.

## User asks / access needed

Needed from Emeka eventually, not required for source registry/daily plan prototype:
- Preferred app name/brand.
- Whether initial target is Canadian RPN students, US LPN NCLEX-PN students, or both.
- Whether to spend paid model credits for 10-question rewrite experiments after the request pack is wired into AdminReview.
- Any legitimate school/public resource links he wants considered.
- Human clinical reviewer names/roles if he wants review metadata to be truthful.

Do not ask for:
- UWorld/Archer/Kaplan login.
- Paid qbank PDFs/screenshots.
- Leaked exam dumps.
- Secrets unless a specific deployment/integration requires them.
