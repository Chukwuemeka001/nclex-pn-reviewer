# NCLEX App Audit - 2026-05-12

Project path: `/Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use`

## Executive Verdict

The app is a real local MVP, not just an idea. It has a React/Vite quiz app, local admin review console, a file-writing review API, and a qbank pipeline. The build passes.

The business risk is not the UI. The risk is content safety. The current generated/review artifacts are useful for private research and workflow development, but they should not be published or treated as production-ready content yet.

## Verification Run

Commands run:

```bash
cd app
npm run build
npm run review-api
node scripts/smoke_test_app.mjs
```

Results:
- `npm run build`: passed.
- Review API: started successfully on `http://127.0.0.1:5174`.
- Smoke test: passed after Review API was running.

Smoke test output summary:
- checked source files: 8
- demo questions: 3
- approved files present locally: 5
- approved questions currently usable locally: 1
- approved fallback status: not using demo fallback while local approved files exist
- tag groups: 13

Note: the first smoke test failed because the review API was not running. That is not an app-code failure; the script expects the API server to be up.

## Repo Safety Work Completed

Added `.gitignore` to block:
- `node_modules`
- `dist`
- `.env` / local secret files
- raw source extraction files
- generated blueprints/drafts/audits/review queues
- approved/rejected question exports
- review logs
- validation/batch reports
- source-identifying manifests
- `rise-extraction/`

Reason: even derived qbank artifacts can contain source structure, source IDs, source metadata, or source-identifying details. They are private until cleared.

## Current Pipeline Counts Observed Locally

From local qbank artifacts:
- raw source JSON files: 7
- blueprint JSON files: 5
- original draft JSON files: 5
- similarity audit JSON files: 5
- clinical review queue JSON files: 5
- approved question JSON files: 5
- validation report JSON files: 5
- review log JSON files: 1

From `pipeline_run_summary.json`:
- raw questions: 108
- groups: 3
- blueprints: 108
- drafts: 324
- audits: 324
- review queue count: 268
- risk counts: 323 low similarity, 1 medium similarity
- validation status: pass

From all local similarity audit files scanned:
- audit items: 708
- low similarity risk: 705
- medium similarity risk: 3
- image-based source converted to clinical use: 9 flagged cases
- max stem overlap observed: 25%
- max answer-choice overlap observed: 22.2%
- max rationale overlap observed: 12.5%
- max correct-answer phrasing overlap observed: 50%

## Approved Content Status

The app currently sees only 1 locally approved question as reviewed approved.

The scan did not find publish-blocking source keys inside the approved item itself, but this does not mean the content is ready to sell. It only means the currently approved export is structurally cleaner than the raw/review artifacts.

Before any public beta, approved questions still need a stricter clinical + originality review.

## Main Risks

### 1. Content is source-derived

The current pipeline is built around private source extraction and transformation. That is useful for research and testing the workflow, but dangerous if treated as production content.

Do not publish the raw, blueprint, draft, audit, review-queue, or source manifest files.

### 2. Low similarity does not automatically mean legally safe

Word-overlap checks help, but they are not enough. A question can have low word overlap and still preserve:
- same clinical scenario
- same answer logic
- same distractor pattern
- same source structure
- same unique teaching point

Manual review is still mandatory.

### 3. CAT-style is not real CAT

The current app can honestly say CAT-style or CAT-inspired practice. It should not claim to be a real NCLEX CAT simulator until there is a real psychometric model.

### 4. Clinical review workflow is early

The project needs durable review metadata before SaaS:
- reviewed by
- reviewed date
- clinical confidence
- rationale quality score
- copyright risk status
- content version
- retired/flagged status

### 5. Generated artifacts are not public-safe

The `.gitignore` intentionally excludes these files for now. If later you want to publish a sanitized question pack, create a separate export command that strips source traces and only includes independently cleared content.

## Recommended Next Build Tasks

1. Add a `sanitize-approved-export` script.
   - Input: locally approved questions.
   - Output: `public_question_exports/*.json`.
   - Strip all source/private trace keys.
   - Fail if source-identifying strings or private keys appear.

2. Strengthen smoke test.
   - Either auto-start/check Review API or split into:
     - file/data smoke test
     - API smoke test
   - Current script fails if API is not running.

3. Add review metadata fields to admin workflow.
   - reviewer ID/name
   - clinical confidence
   - rationale quality score
   - copyright risk status
   - manual override note

4. Build first 50-question private beta pack manually and slowly.
   - Do not chase volume.
   - Every question must pass content safety and clinical review.

5. Add visible product disclaimer in the app UI.
   - Not affiliated with NCSBN.
   - NCLEX-style practice only.
   - CAT-style mode is a study simulator, not official CAT.

## Bottom Line

Technically: the local MVP works.

Commercially: the idea has a plausible SaaS path.

Legally/content-wise: do not publish the current generated pipeline outputs. Use the app and pipeline privately while building a stricter original-content approval workflow.
