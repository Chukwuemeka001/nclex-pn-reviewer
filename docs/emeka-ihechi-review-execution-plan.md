# Emeka + Ihechi Review Execution Plan

Decision: Emeka + Ihechi review is sufficient to move the NCLEX-PN trainer forward. Alexis review is suspended/optional and not a blocker; Emeka may later complete Alexis's lane only for another perspective.

## Goal

Convert the first review batch into a safer, learner-friendly, reviewer-approved mini-bank before scaling item count.

The product remains a cheap/free NCLEX-PN/RPN daily trainer + error journal/remediation coach, not a UWorld clone.

## Phase 1 — Intake and normalize reviews

Inputs:

- Emeka review decisions and notes.
- Ihechi review decisions and notes.
- Optional later Alexis notes only if available, but no waiting.

For every reviewed item, normalize into:

- `itemId`
- reviewer: `emeka` or `ihechi`
- decision: `approve`, `needs_revision`, `reject`, or `unclear`
- severity: `low`, `medium`, `high`
- issue category:
  - clinical/scope concern
  - unclear wording
  - weak rationale
  - weak why-wrong explanation
  - obvious/cartoonish distractor
  - correct answer too guessable
  - source/provenance concern
  - learner-confusion risk
- concrete rewrite instruction

## Phase 2 — Triage rules

Use two-person quorum:

1. Both approve: item can enter candidate approved pool after automated guard checks.
2. One approve, one needs revision: revise once, then send only revised diff back to Emeka/Ihechi if clinically material.
3. Either reviewer rejects: item is pulled from candidate pool until rewritten from scratch or replaced.
4. Any source-safety concern: quarantine item; do not rewrite around proprietary wording.
5. Any PN/RPN scope concern: quarantine until clinical wording is corrected.

## Phase 3 — Fix quality defects before scaling

Priority order:

1. Safety/source issues.
2. Clinical correctness and PN/RPN scope.
3. Stem clarity and no trick wording.
4. Correct answer not guessable from stem wording.
5. Plausible distractors that represent realistic learner errors.
6. Rationales that explain why the right option is right.
7. `whyWrong` explanations that teach why each wrong option is wrong.

Known defects to keep hunting:

- Generic rationales.
- Wrong options that are obviously unsafe or silly.
- Correct answer repeating stem wording.
- Feedback that does not teach the learner how to think next time.

## Phase 4 — Rewrite Lab workflow

For each item needing work:

1. Preserve original item and review notes.
2. Draft a rewritten version in AdminReview/Rewrite Lab or equivalent internal staging.
3. Run automated checks:
   - learner-friendly rationale guard
   - distractor quality guard
   - source/provenance metadata present
4. Human-check the rewritten item before public approval.
5. Only promote after review status is explicit.

## Phase 5 — Next shippable milestone

Target milestone: first approved mini-bank.

Definition of done:

- 10 reviewed items processed through Emeka + Ihechi quorum.
- No rejected/quarantined item appears in learner mode.
- Approved items have:
  - learner-friendly rationale
  - option-specific `whyWrong`
  - plausible distractors
  - safe source/provenance metadata
  - PN/LPN/RPN-appropriate scope
- Reviewer log can explain why each item was approved/revised/rejected.

## Immediate next action

Pull the submitted reviews from the backend/private Gist, normalize them into a triage table, then produce the first revision queue:

1. Approved candidates.
2. Needs-revision items.
3. Rejected/quarantined items.
4. Missing-review items.

After that, fix only the high-signal repeated defects first. Do not scale to 25–50 items until the first 10 are clean.
