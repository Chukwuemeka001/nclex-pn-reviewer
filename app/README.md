# NCLEX-PN Study App MVP Quiz Engine V1

Local React + Vite quiz engine for approved NCLEX-PN practice questions.

## Data Rule

The app must not render raw extracted source questions. It loads from:

```text
../qbank_pipeline/approved_questions/*.json
```

If no approved questions exist, it falls back to:

```text
app/src/data/demo_seed_questions.json
```

## Run

```bash
npm install
npm run dev
```

## Review Console

Start the local file-writing review API in a second terminal:

```bash
npm run review-api
```

Then open the app and choose `Admin`.

The review console reads:

```text
../qbank_pipeline/original_drafts
../qbank_pipeline/blueprints
../qbank_pipeline/similarity_audits
../qbank_pipeline/clinical_review_queue
../qbank_pipeline/tag_index.json
```

It writes:

```text
../qbank_pipeline/approved_questions/review_console_approved_questions.json
../qbank_pipeline/rejected_questions/review_console_rejected_questions.json
../qbank_pipeline/review_logs/review_events.json
../qbank_pipeline/review_logs/review_working_items.json
```

Raw source question text is not shown by default. The private `Show source trace` toggle reveals trace metadata for audit/debugging only.

Approval requires:

- low similarity risk, or a manual override note
- clinical review status `reviewed_passed`
- tag review status `reviewed_passed`
- valid stem, choices, correct answer, rationale, and NCLEX tagging
- all transformation warnings resolved

Review API routes:

- `GET /`
- `GET /health`
- `GET /api/review/state`
- `POST /api/review/save`
- `POST /api/review/items/:id/approve`
- `POST /api/review/items/:id/reject`
- `POST /api/review/items/:id/rewrite`
- `POST /api/external-reviews`
- `POST /api/review/batch-approve`
- `POST /api/review/items/:id/apply-rewrite`

The frontend calls `/api/review/*`; `vite.config.js` proxies that path to `http://127.0.0.1:5174` during local development. The student question loader checks the review API approved list first so newly approved local questions can appear after a browser refresh. If the API is unavailable, it falls back to demo seed questions.

Smoke test:

```bash
node scripts/smoke_test_app.mjs
```

## Build

```bash
npm run build
```

## Supported MVP Modes

- Tutor Practice
- Timed Practice
- Tagged Practice
- Question Type Drill
- CAT-style simulator
- Weak Area Drill placeholder
- Daily Study Plan placeholder

The CAT-style simulator is only a lightweight practice selector. It is not the real NCLEX algorithm.

## Normalized Question Schema

Questions are normalized at load time to:

```js
{
  id,
  status,
  examProgram,
  itemType,
  stem,
  choices,
  correctAnswerIndexes,
  correctAnswerText,
  rationale,
  whyWrong,
  tagging,
  difficulty,
  estimatedTimeSeconds,
  sourceTracePrivate,
  review,
  createdAt,
  updatedAt
}
```
