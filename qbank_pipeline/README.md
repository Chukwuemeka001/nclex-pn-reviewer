# Full Qbank Pipeline

This pipeline is for private analysis and concept-blueprint generation only. Raw extracted source questions are private traceability artifacts and must not be published or used as production app content.

## Folders

- `source_raw/`: private extracted Rise source JSON/CSV/warnings.
- `validation_reports/`: raw extraction validation reports.
- `blueprints/`: concept blueprints derived from source records.
- `original_drafts/`: three private draft variants per blueprint.
- `similarity_audits/`: source-vs-draft similarity and safety audits.
- `clinical_review_queue/`: items that need rewrite and/or clinical review.
- `approved_questions/`: only low-risk, reviewed questions are exported here.
- `rejected_questions/`: reserved for rejected drafts and review notes.

## Source Registry

Before using official, free, open, or public-health material to guide concepts or remediation, register it:

```bash
node qbank_pipeline/scripts/source_registry.test.mjs
node qbank_pipeline/scripts/source_registry.mjs --validate
```

Registry file:

```text
qbank_pipeline/source_registry.json
```

Each source entry tracks URL, source type, license, allowed use, prohibited use, attribution requirements, checked date, status, and notes.

Safe use examples:

- NCSBN/NCLEX pages: framework/reference/link only.
- Open RN/WisTech: concept and remediation source with attribution and media/license checks.
- MedlinePlus/CDC: plain-language/public-health reference where page-specific usage permits.

Hard rejections:

- leaked NCLEX material
- brain dumps or recall dumps
- paid qbank PDFs/screenshots
- UWorld/Archer/Kaplan/ATI/HESI/Saunders/Bootcamp/SimpleNursing-derived content

## Browser Extraction

Extraction must run inside the Codex Browser plugin Node REPL because it needs the active browser `tab`.

From the Qbank lesson page containing all Rise links:

```js
const runner = await import("file:///Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/qbank_pipeline/scripts/browser_extract_full_qbank.mjs");
const manifest = await runner.writeDiscoveredManifest(tab);
nodeRepl.write(JSON.stringify(manifest, null, 2));
```

Review `manifests/qbank_manifest.json`. Then run extraction:

```js
const runner = await import("file:///Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/qbank_pipeline/scripts/browser_extract_full_qbank.mjs");
const results = await runner.extractFromManifest(tab, { maxQuestions: 500 });
nodeRepl.write(JSON.stringify(results, null, 2));
```

To resume from a specific quiz:

```js
await runner.extractFromManifest(tab, { startAtSlug: "assistive-devices-test", maxQuestions: 500 });
```

## Offline Pipeline

After raw extraction:

```bash
node qbank_pipeline/scripts/full_qbank_pipeline.mjs offline-all
```

This validates raw files, creates blueprints, generates three draft variants per blueprint, runs similarity audits, and builds the clinical review queue.

Every blueprint and draft includes a normalized `tagging` object for NCLEX-style filtering. Allowed tag IDs and human-readable labels are written to:

```text
qbank_pipeline/tag_index.json
```

Tag IDs use lowercase kebab-case for topic, population, safety, body-system, and skill groups. If the pipeline must use a pending tag, the item receives:

```json
"reviewStatus": "needs_tag_review"
```

## Approval Export

Drafts are not approved automatically. A reviewer must update items in `clinical_review_queue/` to:

```json
"reviewStatus": "reviewed_approved"
```

Only items that are both reviewed and `low_similarity_risk` are exported to the private approved folder:

```bash
node qbank_pipeline/scripts/full_qbank_pipeline.mjs export-approved
```

## Sanitized Public Export

Before any approved question content is copied into an app bundle, beta seed, or public-safe pack, run the sanitizer:

```bash
node qbank_pipeline/scripts/sanitize_approved_export.mjs
```

Default input:

```text
qbank_pipeline/approved_questions
```

Default output:

```text
qbank_pipeline/public_question_exports
```

The sanitizer:

- recursively reads approved-question JSON files
- keeps only `reviewed_approved` items
- normalizes them into the public question schema
- strips private/source/audit keys such as `sourceQuestionId`, `sourceTracePrivate`, `sourceGroup`, `audit`, `sourceBlueprintId`, and `similarityAuditId`
- scans the final export for source-identifying text, URLs, and unsafe private keys
- fails hard if anything unsafe remains

Test it with:

```bash
node qbank_pipeline/scripts/sanitize_approved_export.test.mjs
```

Do not commit `qbank_pipeline/public_question_exports/` unless the exported pack has been explicitly approved for publication.

## NCLEX Improvement Loop

After sanitizer and rubric gates exist, run the first 10-question improvement loop before scaling to 50:

```bash
node qbank_pipeline/scripts/nclex_improvement_loop.test.mjs
node qbank_pipeline/scripts/nclex_improvement_loop.mjs --limit=10
```

Default output:

```text
qbank_pipeline/improvement_reviews/nclex_improvement_loop_10.json
qbank_pipeline/improvement_reviews/nclex_improvement_loop_10_summary.json
```

The loop:

- selects approved questions first, then low-risk generated candidates
- scores each candidate with the NCLEX quality rubric
- identifies weak criteria and maps them to targeted rewrite fields
- creates rewrite instructions for stem, distractors, rationale, why-wrong explanations, metadata, clinical review, or source-safety review
- records a projected rescore after targeted revision

Model-assisted request-pack mode:

```bash
node qbank_pipeline/scripts/nclex_improvement_loop.mjs --limit=10 --model-assisted --provider=anthropic --model=claude-sonnet-4
```

This writes:

```text
qbank_pipeline/improvement_reviews/nclex_improvement_loop_10_model_assisted.json
qbank_pipeline/improvement_reviews/nclex_improvement_loop_10_model_assisted_summary.json
```

Model-assisted mode does not call a paid model API. It creates a private request pack with per-question prompts, allowed rewrite fields, locked fields, weak criteria, and source-safety rules. Use it to send only targeted weak-field rewrite tasks to a model, then manually review any returned rewrites before copying them into approved questions and re-running the rubric/sanitizer.

The improvement review output is private working content and is ignored by git. It may include draft question text and must not be treated as a public export. The loop is a first-pass triage tool, not a substitute for human PN clinical review.

## Guardrails

- Do not publish `source_raw/`.
- Do not publish files containing `sourceQuestionId`, source URLs, or raw source text.
- Do not approve items with inferred answer keys until clinically reviewed.
- Do not approve image-derived items converted to text-only without media review.
- Do not treat generated variants as production content until clinical review and similarity review are complete.
