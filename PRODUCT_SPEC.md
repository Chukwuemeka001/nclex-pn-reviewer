# NCLEX-PN SaaS Product Spec

Status: Week 1 working spec. This is intentionally strict so the project does not become a copyright-risky question dump or an overbuilt fake CAT product.

## One-Sentence Product

A PN-focused NCLEX-style study app that helps practical nursing students drill weak areas with clean original questions, nurse-tutor rationales, and lightweight adaptive practice.

## Target User

Primary initial user:
- Practical nursing / RPN / LPN students preparing for NCLEX-PN-style exams.
- Students who need simple practice, rationales, safety/prioritization drills, and weak-area repetition.

Initial niche wedge:
- PN students who want explanations that sound like a practical nurse/tutor, not a textbook robot.
- Focus first on safety, infection control, prioritization, delegation, health promotion, gerontology, mental health, and common med-surg fundamentals.

Not the first target:
- RN-level advanced prep.
- Full psychometric CAT replacement.
- Broad UWorld-style giant qbank clone.

## Market Positioning

Allowed language:
- NCLEX-style practice.
- PN exam prep.
- Nursing practice questions.
- Adaptive practice / CAT-inspired practice.
- Nurse-tutor rationales.

Forbidden language until legally/technically reviewed:
- Official NCLEX.
- NCSBN affiliated.
- Real CAT simulator.
- Guaranteed pass.
- Uses actual exam questions.

## MVP Scope

MVP must stay small:
1. Student quiz modes
   - Tutor practice
   - Timed practice
   - Tagged practice
   - Question type drill
   - CAT-inspired/adaptive practice selector
   - Weak-area drill placeholder or simple implementation
2. Admin review console
   - Review generated/original drafts.
   - Show content safety status.
   - Approve/reject/rewrite.
   - Write review logs locally for now.
3. Question bank pipeline
   - Private raw/source area.
   - Original question drafting.
   - Similarity audit.
   - Clinical review queue.
   - Approved-only export.
4. First content target
   - 50 clinically reviewed, low-risk, high-quality questions.
   - Do not chase 1,000 questions before proving the workflow.

Out of scope for current MVP:
- Payments.
- Multi-user SaaS auth.
- Real CAT psychometrics.
- Mobile app store release.
- Public marketing claims.
- Large-scale imported qbank.

## Current App Architecture

Project root:
`/Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use`

Frontend:
- `app/`
- React + Vite
- Main scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run review-api`

Review/backend-local:
- `app/server/reviewApi.mjs`
- Local file-writing API for review workflow.

Pipeline:
- `qbank_pipeline/`
- Source/raw material stays private and ignored by git.
- Generated review artifacts stay private until cleared.

## Normalized Question Schema

Each production-ready item should have:
- `id`
- `status`
- `examProgram`
- `itemType`
- `stem`
- `choices`
- `correctAnswerIndexes`
- `correctAnswerText`
- `rationale`
- `whyWrong`
- `tagging`
- `difficulty`
- `estimatedTimeSeconds`
- `sourceTracePrivate` set to null or excluded from publish builds
- `review`
- `createdAt`
- `updatedAt`

Production review metadata should eventually include:
- `reviewedBy`
- `reviewedAt`
- `clinicalConfidence`
- `rationaleQualityScore`
- `copyrightRiskStatus`
- `contentVersion`
- `retiredAt`
- `flaggedReason`

## Content Approval Workflow

A question is not production-ready until all are true:
1. It is original enough to stand without the source.
2. It does not preserve source structure, answer pattern, or distinctive scenario too closely.
3. Similarity audit is low-risk or manually escalated/resolved.
4. Clinical review is passed by a qualified reviewer.
5. Tag review is passed.
6. Rationale teaches why the correct answer is best and why distractors are wrong.
7. No inferred answer key remains unresolved.
8. Image/media-based items are reviewed with the original media context or rewritten into a fully independent item.
9. It has no private source trace in publishable output.

## Quality Bar

A good question should:
- Test one clear nursing decision.
- Avoid ambiguous stems unless ambiguity is clinically intentional.
- Include plausible distractors.
- Have a rationale that teaches clinical reasoning, not just fact recall.
- Include NCLEX-style tagging.
- Use safe, current nursing practice.

## Private Beta Definition

Private beta can begin when:
- Git repo exists and protects private source files.
- Build passes.
- At least 50 questions are reviewed and approved.
- Beta disclaimers are visible.
- User progress works locally or via a simple database.
- Tester feedback can be collected.

## SaaS Readiness Later

Before charging users, add:
- Auth.
- Database.
- User progress persistence.
- Admin CMS/content review workflow.
- Stripe payments/subscriptions.
- Error monitoring.
- Backups.
- Privacy policy and terms.
- Clear non-affiliation disclaimer.

## Brutal Product Rule

The app shell is not the moat. The moat is question quality, clean originality, clinical review, trusted rationales, and a disciplined approval pipeline.
