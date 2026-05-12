# NCLEX-PN Hermes Session Context

Last updated: 2026-05-12 07:44 EDT
Repo: /Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use
Branch: main

## Why this file exists

Hermes/chat context can compact. This file is the durable local handoff so future sessions can recover the project direction without depending on the full chat transcript.

At the start of a new Hermes session, say:

Read `/Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/HERMES_NCLEX_CONTEXT.md` and continue from there.

## Product direction

Do not build a UWorld clone.

The real wedge is:

NCLEX-PN Daily Trainer: cheap/free PN-focused study workflow that turns every missed/flagged question into an error journal entry, remediation plan, and daily practice focus.

Early positioning:

Use any qbank; bring your missed areas here; this app turns them into a PN-safe daily plan.

## Current strategic docs

- PRODUCT_SPEC.md
- CONTENT_SAFETY.md
- NCLEX_MARKET_AND_PRODUCT_EDGE.md
- NCLEX_FREE_SAFE_SOURCE_STRATEGY.md
- NCLEX_QUESTION_QUALITY_RUBRIC.md
- HERMES_NCLEX_CONTEXT.md

## Content safety rule

Never ingest/copy/rewrite leaked NCLEX questions, brain dumps, UWorld, Archer, Kaplan, ATI, HESI/Evolve, Saunders, Bootcamp, SimpleNursing, NurseAchieve, Picmonic, or other proprietary qbank content.

Safe use:
- NCSBN/NCLEX public pages as framework references and links.
- Open RN / WisTech OER as licensed nursing knowledge with attribution.
- MedlinePlus/CDC/NIH/NLM public-domain/federal health info where license allows.
- State competency frameworks as alignment references, not official claims.

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
- Keep human clinical/source-safety review mandatory.

Route:
- /rewrite

### Error Journal MVP

Files:
- app/src/lib/errorJournal.js
- app/src/lib/errorJournal.test.mjs
- app/src/pages/ErrorJournal.jsx

Purpose:
- Save incorrect/flagged questions from Results.
- Store locally in browser localStorage for now.
- Tag why missed: prioritization, content gap, misread, anxiety, delegation/scope, etc.
- Build daily remediation tasks from tags/reasons.
- Mark reviewed or review later.

Route:
- /journal

## Important commands

From repo root:

node qbank_pipeline/scripts/nclex_improvement_loop.test.mjs
node qbank_pipeline/scripts/sanitize_approved_export.test.mjs

From app/:

npm run test:rubric
npm run test:rewrite
npm run test:journal
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

Next best steps:
1. Add source registry for safe/open/free source tracking.
2. Add a daily plan screen that combines Error Journal + weak areas + test date/minutes.
3. Add reviewer workflow that imports accepted Rewrite Lab changes back into AdminReview/review API instead of manual copy/paste.
4. Add attribution/licensing fields for Open RN/MedlinePlus/CDC-derived concepts.
5. Improve local persistence or add a small database before beta.
6. Get 50 excellent, clinically reviewed PN questions through the pipeline.

## Brutal truth

The app shell is not the moat.

The moat is:
- original safe questions
- tight PN focus
- clinical judgment rationale quality
- error journal/remediation workflow
- trustworthy source/licensing discipline
- cheap/free positioning that can coexist with UWorld/Archer/Bootcamp instead of trying to replace them immediately
