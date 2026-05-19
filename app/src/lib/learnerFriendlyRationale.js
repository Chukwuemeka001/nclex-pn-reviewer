const JARGON_PATTERNS = [
  /pathophysiological/i,
  /hemodynamic/i,
  /decompensation/i,
  /contraindicat/i,
  /manifestation/i,
  /therapeutic modality/i,
  /utili[sz]e/i,
  /facilitate/i,
  /etiology/i,
  /comorbidit/i,
];

const TEACHING_SIGNALS = [
  /safe|safety|risk|priority|first|before|because|helps|prevents|watch|notice|report|call/i,
  /client|patient|nurse|PN|practical nurse/i,
];

const GENERIC_WHY_WRONG_PATTERNS = [
  /^not (the )?(best|correct) answer\.?$/i,
  /^incorrect\.?$/i,
  /^less appropriate\.?$/i,
  /^not priority\.?$/i,
  /^outside scope\.?$/i,
  /does not (fit|apply|address) (the )?(question|scope|priority)/i,
];

function isGenericWhyWrong(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  if (value.split(/\s+/).length < 6) return true;
  return GENERIC_WHY_WRONG_PATTERNS.some((pattern) => pattern.test(value));
}

export function learnerFriendlyChecklist() {
  return [
    "Start with what the nurse should notice.",
    "Say the safest first action in easy nursing language.",
    "Explain why that action helps the client.",
    "Explain why each wrong answer is less safe, less urgent, or incomplete.",
    "Avoid making the learner feel dumb; teach the trap like a coach.",
    "Keep clinical facts accurate and stay inside PN scope.",
  ];
}

function sentenceCount(text) {
  return String(text || "").split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
}

function averageWordsPerSentence(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  const sentences = Math.max(1, sentenceCount(text));
  return words / sentences;
}

export function assessLearnerFriendlyRationale({ rationale = "", whyWrong = [] } = {}) {
  const issues = [];
  const text = String(rationale || "").trim();
  const wrong = Array.isArray(whyWrong) ? whyWrong.filter(Boolean) : [];
  let score = 4;

  if (text.length < 60) {
    issues.push("Rationale is too short to teach the learner why the answer is safest.");
    score -= 1;
  }
  if (!TEACHING_SIGNALS.some((pattern) => pattern.test(text))) {
    issues.push("Rationale needs clearer nursing teaching language: what to notice, what to do first, and why.");
    score -= 1;
  }
  if (JARGON_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("Use plain nursing language instead of heavy jargon so PN learners do not feel lost.");
    score -= 1;
  }
  if (averageWordsPerSentence(text) > 24) {
    issues.push("Break long sentences into shorter, easier teaching points.");
    score -= 1;
  }
  if (wrong.length < 2) {
    issues.push("Add why the wrong answers are less safe, less urgent, or incomplete.");
    score -= 1;
  } else if (wrong.some(isGenericWhyWrong)) {
    issues.push("Make each why-wrong explanation specific to that option, not just 'not the best answer' or repeated scope language.");
    score -= 2;
  }

  score = Math.max(0, Math.min(4, score));
  return {
    score,
    passed: score >= 3 && issues.length <= 1,
    issues,
    checklist: learnerFriendlyChecklist(),
  };
}

export function buildLearnerFriendlyRewritePrompt({ stem = "", rationale = "", whyWrong = [] } = {}) {
  return `Rewrite this NCLEX-PN rationale in easy nursing language for PN/LPN/RPN students.\n\nRules:\n- Do not change the answer key, clinical facts, or PN scope.\n- Do not sound condescending. Teach like a calm nursing tutor.\n- Explain what the nurse should notice, what action is safest/priority, and why.\n- Explain why each wrong answer is less safe, less urgent, or incomplete.\n- Use short sentences and familiar nursing words.\n- Return JSON only: {"rationale":"...","whyWrong":["..."]}.\n\nStem:\n${stem}\n\nCurrent rationale:\n${rationale}\n\nCurrent why-wrong explanations:\n${JSON.stringify(whyWrong, null, 2)}`;
}
