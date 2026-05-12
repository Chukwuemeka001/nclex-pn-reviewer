# NCLEX Content Safety Guardrails

Status: strict working policy. Treat this as the rulebook before generating, importing, approving, publishing, or selling question content.

## Core Rule

Do not publish raw extracted source questions, lightly paraphrased questions, source answer patterns, source rationales, or source-identifiable traces.

The legal/product goal is not to "reword" someone else's qbank. The goal is to create independent original NCLEX-style questions based on nursing knowledge and reviewed clinical concepts.

## Repository Safety

Ignored/private by default:
- `qbank_pipeline/source_raw/`
- `qbank_pipeline/blueprints/`
- `qbank_pipeline/original_drafts/`
- `qbank_pipeline/similarity_audits/`
- `qbank_pipeline/clinical_review_queue/`
- `qbank_pipeline/approved_questions/`
- `qbank_pipeline/rejected_questions/`
- `qbank_pipeline/review_logs/`
- `qbank_pipeline/validation_reports/`
- `qbank_pipeline/batch_reports/`
- local manifests that name source URLs
- environment/secrets files

Reason: even derived review artifacts can preserve enough structure, metadata, or source trace to be unsafe for public GitHub or production distribution.

## What Is Allowed In Git

Allowed:
- App source code.
- Review API source code.
- Pipeline scripts.
- Documentation.
- Demo seed questions written as original examples.
- Example manifests with fake/sample data.

Allowed later only after explicit clearance:
- Sanitized approved question exports with no source traces.
- Public-safe question packs created independently.

## Red Flags: Reject Or Rewrite

Reject or rewrite if any are true:
- The clinical scenario is basically the same as the source.
- The stem opening pattern is the same and details are only swapped.
- The answer choices map one-for-one to the source choices.
- The correct answer pattern is preserved too closely.
- The rationale repeats the source logic or phrasing.
- The item depends on a source image/media that is not independently recreated or licensed.
- The answer key was inferred and has not been clinically verified.
- The source had stale/inconsistent feedback and the new item did not resolve it.
- The item contains `sourceQuestionId`, source URL, raw source text, or private trace metadata in a publishable export.

## Transformation Is Not Enough

These are not enough by themselves:
- Synonym replacement.
- Changing patient age/gender only.
- Reordering choices only.
- Turning one source question into a SATA item while preserving the same decision.
- Rewriting the rationale sentence-by-sentence.

A safe item should be independently useful without needing to know the source question existed.

## Preferred Safe Creation Workflow

1. Choose a nursing concept from an exam blueprint or curriculum objective.
2. Write a new scenario from scratch.
3. Choose the clinical decision being tested.
4. Create plausible distractors based on common student misunderstandings.
5. Write rationales from clinical reasoning, not from source rationale text.
6. Tag the item.
7. Run similarity/self-check against any private source material if used for inspiration.
8. Clinical reviewer approves or rejects.
9. Export only sanitized approved content.

## Clinical Review Requirements

Each approved item should eventually include:
- reviewer name or ID
- review date
- clinical confidence level
- rationale quality score
- tag review status
- copyright risk status
- notes for any manual override

Reviewers must check:
- current nursing practice
- safest answer
- scope of practice
- delegation/prioritization rules
- ambiguity
- grammar/readability
- explanation quality

## Publish Export Requirements

A publishable question export must not include:
- `sourceQuestionId`
- `sourceQuizTitle`
- source URLs
- raw source text
- private source metadata
- similarity audit details that reveal source wording
- internal review notes that identify the source provider

It may include:
- public item ID
- question content
- answer/rationale
- tags
- difficulty
- reviewed status
- created/updated timestamps
- non-source-specific version metadata

## Marketing / Legal Language

Use:
- NCLEX-style
- nursing exam practice
- PN/LPN/RPN-focused practice
- CAT-inspired adaptive practice

Do not use:
- official NCLEX
- NCSBN affiliated
- real CAT simulator
- actual NCLEX questions
- guaranteed pass

## Current Risk Assessment

The current code architecture is directionally correct because it separates raw/private source artifacts from app rendering and says approved questions only.

The current content workflow is not yet safe enough for public release because many generated artifacts are source-derived and need stricter originality + clinical review before anything becomes production content.

## Non-Negotiable Rule

If in doubt, do not publish the item. Rewrite it from the clinical concept, not from the source wording.
