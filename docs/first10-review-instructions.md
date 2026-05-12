# First 10 NCLEX-PN Review Instructions

Generated for Emeka review after the Hermes first-10 targeted rewrite pass.

App route:
- http://127.0.0.1:5173/admin

Review set IDs:
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

What happened:
- The improvement loop selected 10 items.
- Hermes applied targeted rewrites only to allowed fields through the Review API.
- All 10 are now back in `needs_human_review` because model-assisted rewrites must not auto-approve content.
- Average heuristic score moved from 32.7/40 to 33.6/40.
- Publish-ready after apply is intentionally 0/10 until human clinical/source-safety review passes.

How to review in the app:
1. Open Admin Review.
2. Click a row with one of the IDs above.
3. Look at these panels in order:
   - Draft Question Review
   - Distractor plausibility check
   - Student-friendly rationale check
   - Model-Assisted Rewrite Audit
   - Source Registry Lookup
   - Quality Rubric
4. Do not approve by vibes. Review as if a tired PN/LPN student is using this after work.

What I need you to judge for each question:

A. Stem realism
- Does the question sound like something a real NCLEX-PN-style student could see?
- Is it too generated, awkward, or overly obvious?
- Does it ask for one clear nursing decision?

B. Distractor quality
- Are wrong options plausible enough that a student might consider them?
- Are any options cartoonishly unsafe, like "ignore the client" or "give without an order"?
- Are there duplicate wrong answers testing the same idea?
- Is the correct answer too obvious because all other options are stupid?

C. Rationale quality
- Would the explanation teach a PN student without making them feel dumb?
- Does it explain the cue that mattered?
- Does it explain why the correct answer is safest/best/first?
- Does it explain why the wrong options are less safe, lower priority, incomplete, or not first?

D. PN/LPN/RPN scope
- Does the action fit practical nursing scope?
- Does it accidentally ask the PN to diagnose, prescribe, independently change medications, or do provider-only work?

E. Clinical safety
- Is anything clinically wrong, unsafe, or oversimplified?
- Would you be uncomfortable seeing this used to teach a student?

F. Student experience
- Would a weak student understand what to learn from it?
- Would the wording discourage them or make them feel stupid?

Preferred review format to send back:

For each question, use this structure:

ID: [question id]
Decision: PASS / FIX / REJECT
Issue type: stem / distractors / rationale / clinical safety / PN scope / too generated / unclear / other
Notes: [plain explanation]
Suggested fix, if any: [what you would change]
Severity: minor / important / critical

Example:

ID: assistive_devices_first20_q001_variant_a
Decision: FIX
Issue type: distractors
Notes: Option C is plausible but option D still feels too obvious and fake. The rationale is clear though.
Suggested fix: Replace option D with something like documenting intake first or offering adaptive utensils.
Severity: important

Decision definitions:
- PASS = good enough for the next review stage, not necessarily public-ready.
- FIX = usable idea, but something needs revision.
- REJECT = bad item; not worth saving.

Most useful answer from you:
- Be blunt.
- Do not rewrite everything unless you want to.
- Focus on what feels fake, unsafe, confusing, or not NCLEX-like.
- If only one option is bad, say that instead of rejecting the whole item.
