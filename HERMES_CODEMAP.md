# NCLEX-PN Trainer Codemap

Last updated: 2026-05-14 23:54 EDT
Repo: /Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use
Branch observed: main

Purpose: give Hermes/Opus/Sonnet/Codex instant context for the NCLEX app and content pipeline without rereading generated qbank files. This product is a cheap/free NCLEX-PN daily trainer + error journal/remediation coach for Canadian RPN + US LPN students.

## Product role

Not a UWorld clone. The edge is:
- cheap/free access
- daily practice plan
- error journal
- remediation coaching
- content safety/rewrite/review loop
- transparent contributor review process

## Source-of-truth docs

Read first:
- HERMES_NCLEX_CONTEXT.md — durable project handoff.
- PRODUCT_SPEC.md — product spec.
- CONTENT_SAFETY.md — copyright/source safety rules.
- NCLEX_FREE_SAFE_SOURCE_STRATEGY.md — sourcing strategy.
- NCLEX_QUESTION_QUALITY_RUBRIC.md — item quality rubric.
- NCLEX_MARKET_AND_PRODUCT_EDGE.md — business/product edge.
- docs/external-reviewer-orientation.md — reviewer orientation.
- docs/first10-review-instructions.md — first-10 reviewer instructions.
- /Users/emeka/Documents/Emeka_Project_Tracker.md — cross-project roadmap guardrail.
- /Users/emeka/Documents/Emeka_AI_Engineering_Operating_Model.md — model routing/workflow.

## Current proof point

Complete first-10 external review loop with:
- Emeka: founder approval gate.
- Alexis: clinical safety/clarity.
- Ihechi: non-clinical clarity, ambiguity, AI-signals, copyright/source concerns.

Do not scale to 50+ until first-10 feedback is collected and compared.

## App structure

### app/src/App.jsx

Role: single-page app router/state holder.

Important functions:
- `defaultSetup`
- `pathToRoute`
- `routeToPath`
- `initialRoute`
- `hashPath`
- `App`

Routes/sections observed:
- practice setup
- quiz player
- results
- error journal
- daily plan
- weak dashboard
- admin review
- rewrite workbench
- external reviewer guide/lanes

### app/src/pages/AdminReview.jsx

Role: admin approval/review UI.

Important functions/areas:
- `REVIEW_API_BASE`
- item cloning/meta helpers
- risk class/label helpers
- fetches `${REVIEW_API_BASE}/state`
- posts review changes to review API paths

High-risk areas:
- quality gate logic
- approval state writes
- rubric score display
- model-assisted rewrite apply flow

### app/src/pages/RewriteWorkbench.jsx

Role: model-assisted rewrite lab for weak fields only.

Important functions/areas:
- loads sample/batch rewrite requests
- `safeJsonParse`
- `requestFromBatch`
- calls `${REVIEW_API_BASE}/items/{id}/apply-rewrite`

Constraint:
- no blind regeneration.
- rewrite weak fields only.
- preserve safety/source lineage.

### app/src/pages/ExternalReviewerGuide.jsx

Role: external reviewer instructions + capture form.

Important functions/areas:
- `scoreOptions`
- `captureRepo`
- `reviewerKeyFromLocation`
- `storageKeyFor`
- reviewer lane isolation via localStorage key

Reviewer lanes:
- Emeka
- Alexis
- Ihechi

### app/src/lib/externalReviewerRubric.js

Role: external reviewer scoring profiles, criteria, first-10 IDs, scoring logic.

Important exports/functions:
- `REVIEWER_PROFILES`
- `getReviewerProfile`
- `FIRST_TEN_REVIEW_IDS`
- `EXTERNAL_REVIEW_CRITERIA`
- `scoreExternalReview`

### app/src/lib/nclexQualityRubric.js

Role: internal item quality rubric.

Important exports/functions:
- `NCLEX_QUALITY_RUBRIC`
- `CRITERIA_BY_ID`
- `QUALITY_RUBRIC_MAX_SCORE`
- `QUALITY_RUBRIC_PASSING_SCORE`
- `QUALITY_RUBRIC_MIN_CRITICAL_SCORE`
- `emptyQualityRubric`

### app/src/lib/questionLoader.js

Role: loads approved/review state questions into app.

Important functions/areas:
- `REVIEW_API_BASE`
- item normalization helpers
- fetches `${REVIEW_API_BASE}/state`

### app/src/lib/errorJournal.js

Role: builds error journal entries from quiz results.

Important concepts:
- localStorage key
- reason labels
- question tags
- remediation/review status

### app/src/lib/dailyPlan.js

Role: daily practice plan and weak-area prioritization.

Important functions:
- `defaultDailyPlanPreferences`
- `normalizeDailyPlanPreferences`
- daily plan generation helpers

### app/src/pages/QuizPlayer.jsx

Role: quiz/practice runner.

### app/src/pages/ErrorJournal.jsx

Role: error journal UI.

### app/src/pages/DailyPlan.jsx

Role: daily plan UI.

### app/src/pages/PracticeSetup.jsx

Role: setup filters/mode choice.

### app/src/lib/distractorQuality.js

Role: flags cartoonishly unsafe distractors and plausibility issues.

### app/src/lib/learnerFriendlyRationale.js

Role: checks rationale teaching quality and learner-friendly signals.

## Generated/content-heavy directories

These can be huge and should not be blindly pasted into model context:

- qbank_pipeline/clinical_review_queue/
- qbank_pipeline/original_drafts/
- qbank_pipeline/blueprints/
- qbank_pipeline/similarity_audits/
- qbank_pipeline/improvement_reviews/
- qbank_pipeline/private_reference_bank/
- rise-extraction/

Important caution:
- private reference bank is for offline/manual reference only.
- do not publish proprietary/source-derived text.
- do not paste large content dumps into Opus/Sonnet unless needed and sanitized.

## Runtime/test commands

Frontend app:
```bash
cd /Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/app
npm install
npm run dev -- --host 127.0.0.1
```

Review API command was previously used as:
```bash
npm run review-api
```

Before relying on exact command, read `app/package.json`.

## Business roadmap status

NCLEX is ahead on infrastructure but not yet at content proof point.

Done/strong progress:
- safe repo/workflow
- source safety docs
- rewrite lab
- admin review
- quality rubric
- error journal
- daily plan
- reviewer portal/lanes
- GitHub Issues capture flow for external review pilot

Missing proof point:
- first-10 reviewer feedback comparison.
- first 50 approved safe/high-quality questions.

## Sonnet prompt for live NCLEX QA

```text
Inspect the live NCLEX reviewer/learner app in the browser. Do not write code. Do not guess about local files.

Goal: evaluate whether a reviewer/student can complete the intended flow without confusion.

Focus on:
1. Mobile usability.
2. Reviewer instructions clarity.
3. Whether Emeka/Alexis/Ihechi lanes feel isolated and understandable.
4. Any confusing rubric labels.
5. Any friction submitting review feedback.
6. Any learner-facing copy that sounds AI-generated, unsafe, or unclear.

Return a concise report for Hermes:
- steps taken
- issue
- severity
- exact visible text/URL/section
- expected vs actual
```

## Opus prompt only if needed

```text
You are reviewing an NCLEX-PN content safety/review pipeline. Do not generate new qbank content unless explicitly asked.

Project: NCLEX-PN daily trainer
Repo: /Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use
Source-of-truth docs: CONTENT_SAFETY.md, PRODUCT_SPEC.md, HERMES_NCLEX_CONTEXT.md
Relevant files/functions:
- [Hermes fills exact list]

Task:
Analyze [specific safety/rubric/architecture issue].

Constraints:
- no proprietary-source copying
- weak-field rewrites only
- human review gate required
- cheap/free product positioning
- Canadian RPN + US LPN audience

Return:
1. Diagnosis.
2. Minimal safe implementation strategy.
3. Rubric/content safety risks.
4. Tests/checks.
5. What not to change.
```

## Drift call-out rule

If Emeka asks to scale content volume before first-10 review comparison, Hermes must call it out as fake progress.

If Emeka asks for flashy UI/features before content safety/review proof, Hermes should ask how it advances the proof point.
