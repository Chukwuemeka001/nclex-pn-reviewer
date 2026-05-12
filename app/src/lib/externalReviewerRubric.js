export const FIRST_TEN_REVIEW_IDS = [
  "assistive_devices_first20_q008_variant_c",
  "assistive_devices_first20_q001_variant_a",
  "assistive_devices_first20_q001_variant_b",
  "assistive_devices_first20_q001_variant_c",
  "assistive_devices_first20_q002_variant_a",
  "assistive_devices_first20_q002_variant_b",
  "assistive_devices_first20_q002_variant_c",
  "assistive_devices_first20_q003_variant_a",
  "assistive_devices_first20_q003_variant_b",
  "assistive_devices_first20_q003_variant_c",
];

export const EXTERNAL_REVIEW_CRITERIA = [
  {
    id: "stemRealism",
    label: "Stem realism and clarity",
    critical: false,
    lookFor: [
      "One clear nursing decision is being tested.",
      "The situation feels clinically believable, not AI-generated.",
      "The cue needed to answer is present without adding fluff.",
    ],
    redFlags: ["Vague safest/best wording with no cue", "Textbook paragraph instead of a question", "Multiple possible interpretations"],
  },
  {
    id: "distractors",
    label: "Distractor plausibility",
    critical: false,
    lookFor: [
      "Wrong options are tempting but lower priority, incomplete, or not first.",
      "No cartoonishly unsafe options that make the answer obvious.",
      "No duplicate wrong options testing the same mistake.",
    ],
    redFlags: ["Give without an order", "Ignore symptoms/allergy/safety", "Correct answer obvious because all others are stupid"],
  },
  {
    id: "rationaleTeaching",
    label: "Rationale teaching quality",
    critical: false,
    lookFor: [
      "Explains the cue that mattered.",
      "Explains why the correct answer is safest/best/first.",
      "Explains why wrong answers are less safe, incomplete, or lower priority.",
    ],
    redFlags: ["Too short to teach", "Jargon-heavy", "Says correct/incorrect without explaining why"],
  },
  {
    id: "pnScope",
    label: "PN/RPN/LPN scope fit",
    critical: true,
    lookFor: [
      "Action fits practical nursing role.",
      "Does not ask PN to diagnose, prescribe, or independently change medication.",
      "Escalation/notify provider is used where appropriate.",
    ],
    redFlags: ["Provider-only decision", "RN/advanced scope drift", "Unsafe independent medication change"],
  },
  {
    id: "clinicalSafety",
    label: "Clinical safety and accuracy",
    critical: true,
    lookFor: [
      "Correct answer is clinically safe.",
      "No dangerous oversimplification.",
      "Priority/safety logic matches practical nursing judgment.",
    ],
    redFlags: ["Unsafe teaching", "Wrong priority", "Missing escalation for red-flag symptoms"],
  },
  {
    id: "studentExperience",
    label: "Student experience after a long shift",
    critical: false,
    lookFor: [
      "A weak student can understand what they should learn.",
      "Tone is clear and not condescending.",
      "Feedback would build pattern recognition, not shame.",
    ],
    redFlags: ["Makes the learner feel dumb", "Too wordy", "Does not tell the student what to notice next time"],
  },
];

export function scoreExternalReview(scores = {}) {
  const blockers = [];
  let total = 0;
  for (const criterion of EXTERNAL_REVIEW_CRITERIA) {
    const value = Number(scores[criterion.id] ?? 0);
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(4, value)) : 0;
    total += normalized;
    if (criterion.critical && normalized < 2) blockers.push(`${criterion.label} scored below 2/4: reject-level safety/scope issue.`);
    else if (criterion.critical && normalized < 3) blockers.push(`${criterion.label} scored below 3/4.`);
  }
  const max = EXTERNAL_REVIEW_CRITERIA.length * 4;
  let decision = "REJECT";
  if (blockers.length === 0 && total >= 20) decision = "PASS";
  else if (blockers.length === 0 && total >= 15) decision = "FIX";
  else if (blockers.length > 0 && total >= 18 && !blockers.some((blocker) => blocker.includes("reject-level"))) decision = "FIX";
  return { total, max, percent: Math.round((total / max) * 100), decision, blockers };
}

export function summarizeReviewerDecision(decision) {
  if (decision === "PASS") return "Good enough to move to the next review stage; not automatically public-ready.";
  if (decision === "FIX") return "Useful item idea, but it needs revision before approval.";
  if (decision === "REJECT") return "Do not salvage unless there is a strong reason; rebuild or discard.";
  return "Choose PASS, FIX, or REJECT.";
}

export function buildReviewerNoteTemplate(id = "[paste question id]", response = {}) {
  const scores = response.scores || {};
  return `ID: ${id}
Reviewer: ${response.reviewerName || "Alexis"}
Decision: ${response.decision || "PASS / FIX / REJECT"}
Scores:
- Stem realism and clarity: ${scores.stemRealism ?? "_"}/4
- Distractor plausibility: ${scores.distractors ?? "_"}/4
- Rationale teaching quality: ${scores.rationaleTeaching ?? "_"}/4
- PN/RPN/LPN scope fit: ${scores.pnScope ?? "_"}/4
- Clinical safety and accuracy: ${scores.clinicalSafety ?? "_"}/4
- Student experience after a long shift: ${scores.studentExperience ?? "_"}/4
Issue type: ${response.issueType || "stem / distractors / rationale / clinical safety / PN scope / too generated / unclear / source concern / other"}
Alexis notes: ${response.notes || ""}
Suggested fix, if any: ${response.suggestedFix || ""}
Severity: ${response.severity || "minor / important / critical"}`;
}

export function buildReviewIssueBody(item = {}, response = {}, scoreResult = scoreExternalReview(response.scores || {})) {
  return [
    "## External nurse review",
    "",
    `Question ID: ${item.id || response.id || "unknown"}`,
    `Reviewer: ${response.reviewerName || "Alexis"}`,
    `Decision: ${response.decision || scoreResult.decision}`,
    `Computed score: ${scoreResult.total}/${scoreResult.max} (${scoreResult.percent}%)`,
    scoreResult.blockers.length ? `Blockers: ${scoreResult.blockers.join("; ")}` : "Blockers: none",
    "",
    "## Scores",
    ...EXTERNAL_REVIEW_CRITERIA.map((criterion) => `- ${criterion.label}: ${Number(response.scores?.[criterion.id] ?? 0)}/4`),
    "",
    "## Issue details",
    `Issue type: ${response.issueType || "none provided"}`,
    `Severity: ${response.severity || "not selected"}`,
    "",
    "## Reviewer notes",
    response.notes || "No notes provided.",
    "",
    "## Suggested fix",
    response.suggestedFix || "No suggested fix provided.",
    "",
    "## Reviewed item snapshot",
    `Stem: ${item.stem || ""}`,
    "",
    "Choices:",
    ...(item.answerChoices || []).map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`),
    "",
    `Correct answer: ${item.correctAnswerText || (item.correctAnswerIndexes || []).join(", ")}`,
    "",
    `Rationale: ${item.rationale || ""}`,
    "",
    "## Privacy/safety acknowledgement",
    "This review does not include raw NCLEX result-report text, screenshots, email text, or personal identifiers.",
  ].join("\n");
}

export function buildGitHubIssueUrl({ repo = "Chukwuemeka001/nclex-pn-reviewer", item = {}, response = {}, scoreResult } = {}) {
  const computed = scoreResult || scoreExternalReview(response.scores || {});
  const title = `[Review] ${item.id || response.id || "question"} — ${response.decision || computed.decision}`;
  const body = buildReviewIssueBody(item, response, computed);
  const params = new URLSearchParams({ title, body, labels: "external-review" });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}

export const NCLEX_RESULT_REPORT_CASE_STUDY_GUIDANCE = [
  "Use the report only as private learner-needs context; do not upload it to the public app or commit it.",
  "Extract broad weakness areas, not personal identifiers or exact report text.",
  "Map each weakness to daily-plan categories: safety, prioritization, management of care, health promotion, psychosocial, pharmacology, or reduction of risk.",
  "Compare Emeka and Alexis patterns only in aggregate so the product learns what support a real PN student needs.",
];
