# NCLEX-PN Hermes Session Context

Last updated: 2026-05-12 10:58 EDT
Repo: /Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use
Branch: main

## Why this file exists

Hermes/chat context can compact. This file is the durable local handoff so future sessions can recover the project direction without depending on the full chat transcript.

At the start of a new Hermes session, say:

Read `/Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/HERMES_NCLEX_CONTEXT.md` and continue from there.

## Product direction

Do not build a UWorld clone.

The real wedge is:

NCLEX-PN Daily Trainer: cheap/free PN-focused study workflow for Canadian RPN and US LPN students that turns every missed/flagged question into an error journal entry, remediation plan, and daily practice focus.

Early positioning:

Use any qbank; bring your missed areas here; this app turns them into a PN-safe daily plan.

## Current strategic docs

- PRODUCT_SPEC.md
- CONTENT_SAFETY.md
- NCLEX_MARKET_AND_PRODUCT_EDGE.md
- NCLEX_FREE_SAFE_SOURCE_STRATEGY.md
- NCLEX_QUESTION_QUALITY_RUBRIC.md
- HERMES_NCLEX_CONTEXT.md
- BRAND_OPTIONS.md

## Content safety rule

Never ingest/copy/rewrite leaked NCLEX questions, brain dumps, UWorld, Archer, Kaplan, ATI, HESI/Evolve, Saunders, Bootcamp, SimpleNursing, NurseAchieve, Picmonic, or other proprietary qbank content.

Safe use:
- NCSBN/NCLEX public pages as framework references and links.
- Open RN / WisTech OER as licensed nursing knowledge with attribution.
- MedlinePlus/CDC/NIH/NLM public-domain/federal health info where license allows.
- State competency frameworks as alignment references, not official claims.
- User approved Open RN/RN-level nursing materials as concept/remediation references when they are license-safe and transformed into PN-appropriate language/scope.

## Built so far

### App shell

React/Vite app in `app/` with:
- Dashboard
- Practice setup
- Quiz player
- Results
- Review
- Weakness dashboard
- Admin review console
- Rewrite Lab
- Error Journal
- Daily Plan
- Student-friendly rationale guard
- Distractor plausibility guard
- Model-assisted rewrite audit/source registry review panels

### Content/review pipeline

Private qbank pipeline in `qbank_pipeline/`.
Important private/generated folders are git-ignored:
- source_raw/
- original_drafts/
- clinical_review_queue/
- similarity_audits/
- approved_questions/
- public_question_exports/
- improvement_reviews/

### Sanitized export

Script:
- qbank_pipeline/scripts/sanitize_approved_export.mjs

Test:
- qbank_pipeline/scripts/sanitize_approved_export.test.mjs

Purpose:
- Export only approved public-safe questions.
- Strip private/source fields.
- Hard-fail unsafe/private keys.

### Quality rubric

Script:
- app/src/lib/nclexQualityRubric.js

Test:
- app/src/lib/nclexQualityRubric.test.mjs

Purpose:
- 10-criterion NCLEX quality scoring, 40 points.
- Approval requires 32/40+, notes, critical gates.
- Integrated into AdminReview and server approval gate.

### Improvement loop

Script:
- qbank_pipeline/scripts/nclex_improvement_loop.mjs

Test:
- qbank_pipeline/scripts/nclex_improvement_loop.test.mjs

Run:
node qbank_pipeline/scripts/nclex_improvement_loop.mjs --limit=10

Model-assisted request pack:
node qbank_pipeline/scripts/nclex_improvement_loop.mjs --limit=10 --model-assisted --provider=anthropic --model=claude-sonnet-4

Purpose:
- Select approved/low-risk questions.
- Score with rubric.
- Map weak criteria to targeted rewrite fields.
- Generate private model prompt/request pack without calling paid API.
- Rewrite only weak fields, not whole questions.

### Rewrite Lab / Workbench

Files:
- app/src/lib/rewriteWorkbench.js
- app/src/lib/rewriteWorkbench.test.mjs
- app/src/pages/RewriteWorkbench.jsx

Purpose:
- Paste private model-assisted request pack.
- Select request.
- Copy targeted model prompt.
- Paste model JSON response.
- Apply only allowed fields.
- Block unauthorized/locked-field changes.
- Apply accepted rewrite to the private AdminReview working item through `POST /api/review/items/:id/apply-rewrite`.
- Keep human clinical/source-safety review mandatory.

Route:
- /rewrite

### Daily Plan

Files:
- app/src/lib/dailyPlan.js
- app/src/lib/dailyPlan.test.mjs
- app/src/pages/DailyPlan.jsx

Purpose:
- Combines Error Journal, weak areas, exam date, daily minutes, anxiety level, and qbank source preference.
- Produces a small daily plan with question target, remediation, PN safety/delegation drill, and rationale review.

Route:
- /daily-plan

### Student-friendly rationale and distractor guards

Files:
- app/src/lib/learnerFriendlyRationale.js
- app/src/lib/learnerFriendlyRationale.test.mjs
- app/src/lib/distractorQuality.js
- app/src/lib/distractorQuality.test.mjs
- app/src/lib/demoSeedQuestions.test.mjs
- integrated into app/src/pages/AdminReview.jsx

Purpose:
- Flags rationales that are too short, too jargon-heavy, too long-winded, or missing why-wrong teaching.
- Flags cartoonishly unsafe/generated-feeling distractors, e.g. giving medication/laxatives without orders.
- Provides copyable plain-language rewrite prompt and distractor rewrite guidance.
- Keeps this lightweight; reviewer aid, not an auto-approval gate yet.

User feedback captured:
- Constipation demo question's "administer laxative without order" distractor felt too fake/obvious for NCLEX. Replaced it with more plausible wrong options and added a regression test against cartoon distractors.
- Daily Plan was unclear about who chooses the order and sounded like the learner had to explain what they do not know. Revised copy to say the app chooses the order and learner just answers, flags confusion, and reads coach notes.

### Error Journal MVP

Files:
- app/src/lib/errorJournal.js
- app/src/lib/errorJournal.test.mjs
- app/src/pages/ErrorJournal.jsx

Purpose:
- Save incorrect/flagged questions from Results.
- Store locally in browser localStorage for now.
- Export/import JSON backups while still pre-database.
- Tag why missed: prioritization, content gap, misread, anxiety, delegation/scope, etc.
- Build daily remediation tasks from tags/reasons.
- Mark reviewed or review later.

Route:
- /journal

## Important commands

From repo root:

node qbank_pipeline/scripts/source_registry.test.mjs
node qbank_pipeline/scripts/source_registry.mjs --validate
node qbank_pipeline/scripts/nclex_improvement_loop.test.mjs
node qbank_pipeline/scripts/sanitize_approved_export.test.mjs

From app/:

npm run test:rubric
npm run test:rewrite
npm run test:journal
npm run test:daily-plan
npm run test:rationale
npm run test:distractors
npm run test:review-support
npm run test:demo-seed
npm run build
npm run dev
npm run review-api

## Current roadmap position

Completed:
1. Safe repo setup and gitignore.
2. Product/content safety specs.
3. Sanitized approved export.
4. NCLEX quality rubric.
5. Improvement loop.
6. Market/competitor positioning.
7. Model-assisted rewrite request generation.
8. Rewrite Lab UI/workflow.
9. Error Journal MVP.
10. Local durable context file.
11. Source registry for safe/open/free source tracking.
12. Daily Plan screen.
13. Rewrite Lab accepted changes can apply back into AdminReview/review API.
14. Public attribution exception for safe OER/public-source attribution.
15. Error Journal JSON import/export backup.
16. Student-friendly rationale guard in AdminReview.
17. Distractor plausibility guard for generated-feeling answer options.
18. AdminReview model-assisted rewrite audit panel and source registry lookup panel.
19. Daily Plan copy clarified: app chooses order; learner is coached, not asked to explain what they do not know.

Next best steps:
1. Generate/apply first 10 model-assisted rewrites, then have Emeka review only those 10.
2. Measure rubric score improvement before spending paid model budget at larger scale.
3. Get 50 excellent, clinically reviewed PN questions through the pipeline.
4. Add beta disclaimer/non-affiliation text before any public tester sees it.
5. Replace sourceRegistrySnapshot with an automated generated frontend snapshot if source registry grows.
6. Consider database/auth only after local workflow proves useful.

## Brutal truth

The app shell is not the moat.

The moat is:
- original safe questions
- tight PN focus
- clinical judgment rationale quality
- error journal/remediation workflow
- trustworthy source/licensing discipline
- cheap/free positioning that can coexist with UWorld/Archer/Bootcamp instead of trying to replace them immediately
