# External Nurse Reviewer Orientation

Audience: Alexis or any second nurse reviewer who has not been part of the build.

App route:
- Local: http://127.0.0.1:5173/reviewer
- Public mobile pilot: https://chukwuemeka001.github.io/nclex-pn-reviewer/#/reviewer

Admin review route:
- http://127.0.0.1:5173/admin

## Public mobile pilot flow

Live URL:
- https://chukwuemeka001.github.io/nclex-pn-reviewer/#/reviewer

Capture repo:
- https://github.com/Chukwuemeka001/nclex-pn-reviewer

Submission flow:
1. Reviewer fills scores/notes on phone.
2. Draft autosaves in phone localStorage.
3. `Submit to GitHub Issues` opens a prefilled issue.
4. Reviewer taps `Submit new issue` in GitHub.
5. Hermes can later pull issues from the capture repo and convert them into review actions.

Fallback:
- If GitHub login is a blocker, reviewer taps `Copy all saved drafts` and sends the JSON to Emeka.

Privacy:
- The public pilot contains only the first-10 calibration items and no raw private qbank extraction files.
- Do not enter raw NCLEX result-report/email text into the public site.

## Purpose

The reviewer is not checking whether the app looks cool. The reviewer is judging whether each NCLEX-PN-style question is safe, realistic, teachable, and appropriate for PN/RPN/LPN students.

The reviewer should be blunt. A question that feels fake, too obvious, unsafe, out of scope, or unclear should be marked FIX or REJECT.

## First 10 calibration set

Review only these IDs first:

1. assistive_devices_first20_q008_variant_c
2. assistive_devices_first20_q001_variant_a
3. assistive_devices_first20_q001_variant_b
4. assistive_devices_first20_q001_variant_c
5. assistive_devices_first20_q002_variant_a
6. assistive_devices_first20_q002_variant_b
7. assistive_devices_first20_q002_variant_c
8. assistive_devices_first20_q003_variant_a
9. assistive_devices_first20_q003_variant_b
10. assistive_devices_first20_q003_variant_c

In AdminReview:
1. Check `Show model-assisted rewrites only`.
2. Or paste one ID into `Find draft`.
3. Click the draft.
4. Review the question, choices, rationale, distractor check, learner-friendly rationale check, model-assisted audit, source registry lookup, and quality rubric.

## Score each question 0-4 on six criteria

0 = not reviewed / unusable
1 = unsafe, fake, confusing, or very weak
2 = needs important fix
3 = usable with minor or no fix
4 = strong

Criteria:

1. Stem realism and clarity
- One clear nursing decision is tested.
- Scenario feels believable.
- Cue needed to answer is present.

2. Distractor plausibility
- Wrong answers are tempting but lower priority, incomplete, or not first.
- No cartoonishly unsafe wrong answers.
- No duplicate wrong answers.

3. Rationale teaching quality
- Explains the cue that mattered.
- Explains why the correct answer is safest/best/first.
- Explains why wrong answers are less safe, incomplete, lower priority, or not first.

4. PN/RPN/LPN scope fit — critical
- Practical nursing action is appropriate.
- No diagnosing, prescribing, or independent med changes.
- Escalation/notify provider appears where needed.

5. Clinical safety and accuracy — critical
- Correct answer is clinically safe.
- Priority logic is sound.
- No dangerous oversimplification.

6. Student experience after a long shift
- A weak student can understand what to learn.
- Tone is not condescending.
- Rationale builds pattern recognition.

## Decision bands

PASS:
Good enough for the next review stage. Not automatically public-ready.

FIX:
Useful item idea, but revision is needed before approval.

REJECT:
Do not salvage unless there is a strong reason. Rebuild or discard.

Critical rule:
If PN scope or clinical safety scores below 2/4, the item is REJECT even if the wording is polished.

## Required review note format

ID:
Reviewer: Alexis
Decision: PASS / FIX / REJECT
Scores:
- Stem realism and clarity: _/4
- Distractor plausibility: _/4
- Rationale teaching quality: _/4
- PN/RPN/LPN scope fit: _/4
- Clinical safety and accuracy: _/4
- Student experience after a long shift: _/4
Issue type: stem / distractors / rationale / clinical safety / PN scope / too generated / unclear / source concern / other
Alexis notes:
Suggested fix, if any:
Severity: minor / important / critical

## How to use Alexis's NCLEX result report safely

The result report is useful as a private case study, not public content.

Do:
- Use it privately to identify broad weakness categories.
- Convert report information into generic needs like safety, prioritization, pharmacology, management of care, health promotion, psychosocial, reduction of risk, etc.
- Compare Emeka + Alexis weaknesses in aggregate to see what real students need from the product.
- Store any extracted weakness map in ignored/private files only unless it contains no personal information.

Do not:
- Upload the raw email/report to the app.
- Commit the raw report, screenshots, email text, or personal identifiers.
- Use exact report wording in product copy.
- Present one person's result as proof of product effectiveness.

Suggested private extraction format:

Reviewer/Learner: Alexis
Date reviewed:
Report source: private NCLEX result report/email, not committed
Broad weak areas:
- [category]
- [category]
Observed study friction:
- [example: struggled with priority wording, anxiety, changing answers, etc.]
Product implications:
- Daily Plan should include...
- Error Journal should track...
- Rationale should emphasize...

## What counts as high-value feedback

High-value:
- “This distractor is too fake because...”
- “This is out of PN scope because...”
- “The correct answer is debatable because...”
- “The rationale does not teach the cue.”
- “This would confuse a weak student after work.”
- “Good item. Move on.”

Low-value:
- “Looks good” with no score.
- Rewriting the entire item when only one option is bad.
- Approving because the interface looks polished.

## Calibration rule

After Alexis reviews the first 10, compare her review with Emeka's review.

If at least 7/10 are PASS or minor FIX:
- proceed to a 50-question review batch.

If fewer than 7/10 are PASS/minor FIX:
- stop scaling;
- improve rewrite prompts, distractor guard, and rationale guard first.
