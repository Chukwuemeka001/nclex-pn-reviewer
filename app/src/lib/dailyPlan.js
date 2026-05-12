export const DAILY_PLAN_STORAGE_KEY = "nclexPnDailyPlanPreferences.v1";

export function defaultDailyPlanPreferences() {
  return {
    examDate: "",
    dailyMinutes: 45,
    anxietyLevel: 3,
    questionSource: "any_qbank_or_app",
    rationaleStyle: "why_correct_and_why_wrong",
  };
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeDailyPlanPreferences(preferences = {}) {
  const defaults = defaultDailyPlanPreferences();
  return {
    ...defaults,
    ...preferences,
    dailyMinutes: clamp(preferences.dailyMinutes ?? defaults.dailyMinutes, 15, 180, defaults.dailyMinutes),
    anxietyLevel: clamp(preferences.anxietyLevel ?? defaults.anxietyLevel, 1, 5, defaults.anxietyLevel),
  };
}

export function safetyDrillForWeakArea(reasonOrArea = "prioritization") {
  const value = String(reasonOrArea || "").toLowerCase();
  if (value.includes("delegation") || value.includes("scope")) {
    return {
      title: "Delegation / PN-LPN Scope Drill",
      steps: [
        "Name what the PN/LPN can safely do for a stable client.",
        "Name what must be escalated to the RN/provider.",
        "Separate UAP tasks from nursing judgment tasks.",
      ],
    };
  }
  if (value.includes("pharm") || value.includes("med")) {
    return {
      title: "Medication Safety Drill",
      steps: [
        "Identify the highest-risk adverse effect.",
        "State the assessment or lab to check before giving the medication.",
        "Write the teaching point in plain patient language.",
      ],
    };
  }
  return {
    title: "Priority / First Action Drill",
    steps: [
      "Identify the unstable cue first.",
      "Decide whether assessment, safety action, or escalation comes first.",
      "Explain why the safest action beats the tempting distractor.",
    ],
  };
}

function activeJournal(entries = []) {
  return entries.filter((entry) => entry.status !== "reviewed");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function focusAreasFrom(journalEntries = [], weakAreas = []) {
  const areas = [];
  for (const entry of activeJournal(journalEntries)) {
    areas.push(entry.tags?.safety?.[0]);
    areas.push(entry.tags?.topics?.[0]);
    areas.push(entry.tags?.clientNeeds);
    areas.push(entry.reason?.replaceAll("_", " "));
  }
  for (const area of weakAreas || []) areas.push(area.label);
  return unique(areas).slice(0, 5);
}

function daysUntil(examDate, now) {
  if (!examDate) return null;
  const target = new Date(`${examDate}T12:00:00Z`);
  const current = new Date(now || Date.now());
  const days = Math.ceil((target - current) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? Math.max(0, days) : null;
}

export function buildDailyPlan({ journalEntries = [], weakAreas = [], preferences = {}, now = new Date().toISOString() } = {}) {
  const prefs = normalizeDailyPlanPreferences(preferences);
  const active = activeJournal(journalEntries);
  const focusAreas = focusAreasFrom(journalEntries, weakAreas);
  const examCountdownDays = daysUntil(prefs.examDate, now);
  const questionMinimum = prefs.dailyMinutes >= 60 ? 12 : prefs.dailyMinutes >= 30 ? 8 : 5;
  const questionMaximum = prefs.dailyMinutes >= 60 ? 25 : prefs.dailyMinutes >= 30 ? 15 : 8;
  const topReason = active[0]?.reason || weakAreas[0]?.label || "prioritization";
  const drill = safetyDrillForWeakArea(topReason);
  const warnings = [];
  if (active.length === 0 && weakAreas.length === 0) warnings.push("No error journal or weak-area data yet. Start with a short diagnostic set.");
  if (prefs.anxietyLevel >= 4) warnings.push("High anxiety selected: keep today small, timed, and review-focused.");

  const blocks = [];
  if (active.length === 0) {
    blocks.push({ type: "diagnostic", minutes: Math.min(15, prefs.dailyMinutes), task: "Complete a short mixed PN diagnostic set and save misses to the Error Journal." });
  } else {
    blocks.push({ type: "error_journal", minutes: Math.min(15, prefs.dailyMinutes), task: `Review ${Math.min(3, active.length)} active Error Journal item(s) and write the safest first action in your own words.` });
  }
  blocks.push({ type: "qbank_practice", minutes: Math.max(10, Math.round(prefs.dailyMinutes * 0.45)), task: `Do ${questionMinimum}-${questionMaximum} targeted questions from ${prefs.questionSource.replaceAll("_", " ")}. Focus: ${focusAreas.slice(0, 3).join(", ") || "mixed PN fundamentals"}.` });
  blocks.push({ type: "safety_drill", minutes: 8, task: drill.title, steps: drill.steps });
  blocks.push({ type: "rationale_review", minutes: 7, task: `Use rationale style: ${prefs.rationaleStyle.replaceAll("_", " ")}. Explain why wrong answers are wrong.` });

  return {
    generatedAt: now,
    totalMinutes: prefs.dailyMinutes,
    examCountdownDays,
    focusAreas,
    questionTarget: { minimum: questionMinimum, maximum: questionMaximum },
    warnings,
    blocks,
  };
}

export function loadDailyPlanPreferences(storage = globalThis.localStorage) {
  if (!storage) return defaultDailyPlanPreferences();
  try {
    return normalizeDailyPlanPreferences(JSON.parse(storage.getItem(DAILY_PLAN_STORAGE_KEY) || "{}"));
  } catch {
    return defaultDailyPlanPreferences();
  }
}

export function saveDailyPlanPreferences(preferences, storage = globalThis.localStorage) {
  const normalized = normalizeDailyPlanPreferences(preferences);
  if (storage) storage.setItem(DAILY_PLAN_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
