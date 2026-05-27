# External Reviewer Orientation

Audience: Alexis, Ihechi, or any trusted external reviewer who did not build the app with us.

Public mobile reviewer links:
- Emeka: https://chukwuemeka001.github.io/nclex-pn-reviewer/#/reviewer?reviewer=emeka
- Alexis: https://chukwuemeka001.github.io/nclex-pn-reviewer/#/reviewer?reviewer=alexis
- Ihechi: https://chukwuemeka001.github.io/nclex-pn-reviewer/#/reviewer?reviewer=ihechi

Capture repo:
- https://github.com/Chukwuemeka001/nclex-pn-reviewer/issues

## Honest project picture

We are building a low-cost NCLEX-PN/RPN/LPN daily trainer with an error journal and remediation coach. It is not meant to copy UWorld or any paid qbank. The hard problem is making questions that are:

- useful for weak/tired PN learners;
- clinically safe;
- PN/RPN/LPN scope appropriate;
- original and source-safe;
- not obviously AI-generated;
- strong enough to teach through rationales and why-wrong explanations.

The reviewer pilot is calibration-only. These questions are not student-facing public qbank content yet.

## Copyright/source-safety reality

Do not use or import:
- UWorld, Archer, ATI, Kaplan, Saunders, Bootcamp, HESI, BoardVitals, Simple Nursing, or other prep-bank questions;
- free previews from commercial qbanks;
- Quizlet/CourseHero/Studocu/Reddit/Telegram dumps unless each item has a clear commercial-compatible license;
- remembered/reconstructed real NCLEX questions;
- instructor test banks or publisher test-bank PDFs.

Official NCLEX/NCSBN materials are useful for frameworks, test-plan categories, and item-type guidance. They are not a source to copy questions from.

Potentially safe sources for concepts, with checks:
- Open RN/WisTech Open CC BY materials, with attribution and page-level exception checks.
- Verified U.S. federal public-domain clinical materials, with third-party exceptions checked.
- Other true OER such as OpenStax, if the specific material is compatible and attributed.

If a reviewer thinks a question feels copied or familiar, they should tag `source concern` even if they cannot prove it.

## Reviewer roles

### Emeka

Role: founder clinical/product reviewer.

Primary lens:
- founder product bar;
- approval gate: pass, fix, reject, rewrite, or investigate source risk;
- clinical usefulness for PN/RPN/LPN students;
- what should change before Alexis/Ihechi reviews are merged;
- business fit: whether this is actually useful or just qbank filler.

Emeka should use his own reviewer lane for his notes instead of mixing them into Alexis/Ihechi. His reviews become the internal founder baseline for comparison.

### Alexis

Role: clinical/NCLEX-experience reviewer.

Primary lens:
- clinical safety;
- PN/RPN/LPN scope;
- NCLEX-PN realism;
- prioritization and practical nursing judgment;
- rationale quality for a learner who is actively preparing.

Alexis should reject or flag anything clinically unsafe, out of scope, unrealistic, not NCLEX-like, or not useful for remediation.

### Ihechi

Role: non-clinical clarity/source-safety reviewer.

Primary lens:
- AI-generated wording;
- weak logic;
- unclear stems;
- missing facts;
- multiple plausible answers;
- rationales that do not teach;
- suspiciously familiar prep-bank patterns;
- whether a smart learner can follow the question without already knowing nursing jargon.

Ihechi is not expected to be the final clinical authority. He should use `uncertain but concerning` when a clinical issue feels questionable.

## Review method

For each question:
1. Read the stem and choices first.
2. Choose the answer before showing the key/rationale.
3. Show the answer/rationale.
4. Score all six criteria 0-4.
5. Choose PASS, FIX, or REJECT.
6. Add notes: what is wrong, why it matters, and what would fix it.
7. Submit one GitHub Issue per question.

## Rubric

Score each 0-4:

0 = not reviewed / unusable
1 = unsafe, fake, confusing, or very weak
2 = needs important fix
3 = usable with minor/no fix
4 = strong

Criteria:
1. Stem realism and clarity
2. Distractor plausibility
3. Rationale teaching quality
4. PN/RPN/LPN scope fit — critical
5. Clinical safety and accuracy — critical
6. Student experience after a long shift

Critical rule:
If PN scope or clinical safety is below 2/4, the item is reject-level even if it sounds polished.

## Decision meanings

PASS:
Good enough to move to next review stage. Not automatically public-ready.

FIX:
Good idea, but needs revision.

REJECT:
Do not salvage unless there is a strong reason. Rebuild or discard.

## Good review note structure

Question ID:
Reviewer:
Role:
Decision:
Scores:
Issue type:
Confidence:
Severity:
Notes:
Suggested fix:

Good notes say:
- what is wrong;
- why it matters;
- how serious it is;
- what would improve it.

Bad notes say only:
- “looks good”;
- “bad”;
- “AI-ish” without explaining why.

## How responses are captured

The public site is static GitHub Pages. Primary capture is direct submission to a backend endpoint, not GitHub Issues.

Primary flow:
1. Reviewer fills form on phone.
2. Draft autosaves in browser localStorage.
3. Reviewer taps `Submit current review` or `Submit all completed`.
4. The app POSTs structured JSON to the configured endpoint (`VITE_EXTERNAL_REVIEW_SUBMIT_ENDPOINT`, currently Render-backed).
5. Hermes later reviews aggregated submissions and compares reviewer decisions.

Fallback flow:
- If submit fails, the same submit actions copy structured JSON to clipboard for manual handoff.
- `GitHub fallback` can still be used, but it is not the primary capture path.

## Privacy

Do not upload NCLEX result reports, screenshots, emails, or personal identifiers to the public review site. Those can be privately summarized by Hermes from Emeka's laptop into broad weakness categories only.
