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

Only items that are both reviewed and `low_similarity_risk` are exported:

```bash
node qbank_pipeline/scripts/full_qbank_pipeline.mjs export-approved
```

## Guardrails

- Do not publish `source_raw/`.
- Do not publish files containing `sourceQuestionId`, source URLs, or raw source text.
- Do not approve items with inferred answer keys until clinically reviewed.
- Do not approve image-derived items converted to text-only without media review.
- Do not treat generated variants as production content until clinical review and similarity review are complete.
