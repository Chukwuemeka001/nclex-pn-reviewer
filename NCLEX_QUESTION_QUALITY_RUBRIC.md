# NCLEX-PN Question Quality Rubric

Purpose: prevent the app from becoming a pile of generic AI questions. A question is not publishable just because it is grammatically clean or source-safe. It must feel like NCLEX-PN: clinical judgment, one best answer, plausible distractors, safe PN scope, and teachable rationale.

## Publish Gate

A question can be approved only when all are true:

1. Total rubric score is at least 32/40.
2. Every criterion has a 0-4 score.
3. Every criterion has a reviewer note.
4. Critical criteria score at least 3/4:
   - Clinical accuracy
   - Answer key quality
   - Rationale quality
   - PN scope fit
   - Originality/source safety
5. Existing safety gates still pass:
   - low similarity risk, or explicit override with note
   - clinical review status = reviewed_passed
   - tag review status = reviewed_passed
   - no unresolved transformation warnings
   - sanitizer passes before public export

## Scoring Anchors

0 = unsafe/unusable
1 = major problem
2 = revision required
3 = acceptable for reviewed beta content
4 = strong NCLEX-style item

## Criteria

### 1. Clinical accuracy — critical
Question facts, nursing action, contraindications, priority logic, and escalation are clinically correct.

0: unsafe or clinically wrong
1: major clinical doubt remains
2: partly correct but needs nurse/educator review before use
3: clinically acceptable with minor wording improvements
4: clinically solid, safe, and defensible

### 2. NCLEX decision focus
Stem requires a nursing judgment, priority, safety, delegation, teaching, or next-best-action decision.

0: pure recall or fact lookup
1: mostly recall with weak clinical decision
2: some judgment, but answer can be guessed from wording
3: clear nursing decision with one best answer
4: feels like NCLEX: assess/intervene/prioritize/delegate/teach under realistic constraints

### 3. Stem clarity and realism
Scenario is concise, realistic, grammatically clean, and only includes data needed for the decision.

0: confusing, broken, or unusable
1: ambiguous or overloaded with irrelevant details
2: understandable but not exam-polished
3: clear and realistic
4: concise NCLEX-style scenario with purposeful clinical cues

### 4. Answer key quality — critical
Correct option(s) are unambiguously best. The item type matches the number of correct responses.

0: wrong key or multiple unintended correct answers
1: likely key problem
2: needs review; ambiguity remains
3: correct answer is defensible
4: one best answer or correct SATA set is airtight

### 5. Distractor plausibility
Wrong choices are clinically plausible but clearly less safe, less priority, or less complete.

0: distractors are obviously silly or unrelated
1: most distractors are weak
2: some plausible distractors, but item is too easy
3: distractors are plausible and teachable
4: distractors mirror common nursing-student traps without being unfair

### 6. Rationale quality — critical
Rationale teaches the nursing principle and explains why wrong answers are wrong.

0: missing or misleading rationale
1: rationale only repeats the answer
2: partly explains answer but weak why-wrong teaching
3: explains correct answer and most distractors
4: strong teaching rationale: principle, priority logic, and why-wrong explanations are clear

### 7. Cognitive level
Question tests application, analysis, and clinical judgment rather than memorization.

0: memorization only
1: low-level recognition
2: some application
3: application/analysis level
4: clinical judgment with prioritization or cue interpretation

### 8. PN scope fit — critical
Expected answer fits practical nursing scope and does not silently require RN/provider-only judgment.

0: unsafe or outside PN scope
1: scope mismatch likely
2: scope unclear; needs review
3: fits PN scope
4: strong PN fit with appropriate escalation/delegation boundaries

### 9. Tagging and metadata
Client needs, clinical judgment step, body system/topic/skill/safety tags, difficulty, and item type are accurate enough for analytics.

0: tags missing or wrong
1: major tag problems
2: partial tags; needs cleanup
3: tags are usable
4: tags are precise enough for analytics and weak-area drills

### 10. Originality/source safety — critical
Question is public-safe: no source wording, source scenario pattern, URLs, provider names, or private trace leakage.

0: unsafe source/private leak
1: high source-derived risk
2: possible source-pattern carryover; rewrite required
3: low source risk after review
4: original, clean, and safe for sanitized export

## Reviewer Rule

If you cannot write a one-sentence note explaining why a score is justified, the score is not real. Do not approve.

## Blunt Standard

A safe question is not automatically an NCLEX-style question.
A clinically correct question is not automatically an NCLEX-style question.
An AI-polished question is not automatically an NCLEX-style question.

Publishable means: safe, clinically defensible, PN-scope appropriate, exam-like, and teachable.
