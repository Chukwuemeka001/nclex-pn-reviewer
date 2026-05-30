# Opus Prompt — NCLEX Generation Logic Integrity Audit (Multi-Expert)

Use this prompt in Claude Opus (desktop/web) from repo root:
`/Users/emeka/Code/2026-05-02/hey-codex-browser-plugin-browser-use`

---

You are conducting a **full integrity and quality audit** of this NCLEX-PN question-generation system.

## Mission
Audit our full question-generation and review logic end-to-end, then return concrete recommendations that can be implemented immediately (with exact file-level changes and command-level validation).

Your output must be directly executable by an engineer with approval.

## Critical context
This project is building a low-cost NCLEX-PN trainer. Prior issues included:
- generic `whyWrong` distractor explanations,
- occasional answer-position skew,
- distractors that are too cartoonish/obvious,
- drift between `correctAnswerIndexes` and `correctAnswerText`,
- frontend submit-path reliability issues,
- quality inconsistency across domains.

We already have tests and gates, but we need stronger system-level guarantees.

## Hats (run all, then synthesize)
You must operate as **at least these 4 experts**:

1. **NCLEX Psychometrics & Assessment Design Expert**
   Focus: item quality, distractor plausibility, cognitive load, exam realism, difficulty calibration, signal leakage.

2. **Clinical Safety + PN Scope Governance Expert**
   Focus: practical-nurse scope boundaries, unsafe teaching risks, escalation logic, legal/ethical correctness.

3. **LLM Content-Safety / Data Provenance Expert**
   Focus: source-safety, anti-copying controls, transformation/audit traceability, originality and leakage risk controls.

4. **Software QA + Reliability Engineer (TypeScript/Node pipelines)**
   Focus: deterministic gates, schema integrity, CI enforcement, failure modes, deployment correctness.

## Required audit targets
Inspect these areas deeply:

- `app/src/data/external_review_first10.json`
- `app/src/data/demo_seed_questions.json`
- `app/src/lib/externalReviewerRubric.js`
- `app/src/lib/externalReviewFirst10Quality.test.mjs`
- `app/src/lib/answerKeyDistribution.test.mjs`
- `app/src/lib/questionIntegrity.test.mjs`
- `app/src/lib/distractorQuality.test.mjs`
- `app/src/lib/learnerFriendlyRationale.test.mjs`
- `app/server/reviewApi.mjs`
- `qbank_pipeline/` structure + logs + submission handling
- build/deploy flow for GitHub Pages (`app/dist` -> repo root)

Also evaluate whether current tests are **necessary + sufficient** to prevent recurrence of known defects.

## Constraints
- No fluff, no motivational text.
- Be brutally specific and implementation-oriented.
- Prioritize highest-risk/highest-impact fixes first.
- Do not propose large rewrites unless justified by clear risk reduction.

## Output format (strict)

### 1) Executive risk map (max 12 bullets)
- Severity: Critical / High / Medium / Low
- Risk statement
- Why it matters
- Where found (exact file + function/test)

### 2) Multi-expert findings
For each hat, provide:
- top 5 findings
- evidence from repo
- false-positive risk for each finding

### 3) Integrity gap matrix
Columns:
- Failure mode
- Current guard
- Guard weakness
- Proposed guard
- Test to add/modify
- Blocking or non-blocking

### 4) Patch plan (engineer-executable)
For each recommendation:
- Priority (P0/P1/P2)
- Exact file(s) to edit
- Exact logic change
- Suggested test case(s)
- Rollback plan

### 5) CI gate hardening plan
Define a minimal, strict gate sequence for merge approvals.
Include exact npm script chain and fail-fast order.

### 6) "Opus can execute" section
Return a ready-to-run implementation sequence that *you* (Opus) could carry out in an approved coding pass:
- Step-by-step task list
- Estimated blast radius
- Verification checklist
- Commit slicing strategy

### 7) Non-negotiable invariants
List invariant rules that must never be violated (schema, answer-key integrity, distractor quality floor, scope safety floor, provenance constraints, etc.)

## Success criteria
Your recommendations are accepted only if they are:
- technically precise,
- testable,
- low-ambiguity,
- executable with minimal follow-up questions.

Start now.
