import { useMemo, useState } from "react";
import { CalendarDays, ClipboardList, ShieldCheck } from "lucide-react";
import { buildDailyPlan, loadDailyPlanPreferences, saveDailyPlanPreferences } from "../lib/dailyPlan.js";
import { weakestAreas, performanceByTags } from "../lib/tagAnalytics.js";

function weakAreasFromResult(result) {
  if (!result?.scored) return [];
  return weakestAreas(performanceByTags(result.scored));
}

export default function DailyPlan({ journalEntries, lastResult, onPractice, onJournal }) {
  const [preferences, setPreferencesState] = useState(() => loadDailyPlanPreferences());
  const weakAreas = useMemo(() => weakAreasFromResult(lastResult), [lastResult]);
  const plan = useMemo(() => buildDailyPlan({ journalEntries, weakAreas, preferences }), [journalEntries, weakAreas, preferences]);

  function setPreferences(next) {
    setPreferencesState(saveDailyPlanPreferences(next));
  }

  return (
    <section className="page daily-plan-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">PN daily trainer</p>
          <h1>Today’s Study Plan</h1>
          <p>Small enough to do after work. The app chooses what comes first based on misses, weak areas, time, and PN safety priorities.</p>
        </div>
        <div className="button-row">
          <button className="secondary-btn" onClick={onJournal}><ClipboardList size={18} /> Error Journal</button>
          <button className="primary-btn" onClick={onPractice}>Start practice</button>
        </div>
      </div>

      {plan.warnings.map((warning) => <div className="notice" key={warning}>{warning}</div>)}
      <div className="notice">
        <strong>Your coach for today:</strong> {plan.coachingNote}
      </div>

      <div className="editor-card">
        <h2>Plan settings</h2>
        <div className="tag-grid">
          <label className="field"><span>Exam date</span><input type="date" value={preferences.examDate || ""} onChange={(e) => setPreferences({ ...preferences, examDate: e.target.value })} /></label>
          <label className="field"><span>Daily minutes</span><input type="number" min="15" max="180" value={preferences.dailyMinutes} onChange={(e) => setPreferences({ ...preferences, dailyMinutes: e.target.value })} /></label>
          <label className="field"><span>Anxiety level 1-5</span><input type="number" min="1" max="5" value={preferences.anxietyLevel} onChange={(e) => setPreferences({ ...preferences, anxietyLevel: e.target.value })} /></label>
          <label className="field"><span>Question source</span><select value={preferences.questionSource} onChange={(e) => setPreferences({ ...preferences, questionSource: e.target.value })}><option value="any_qbank_or_app">Any qbank or this app</option><option value="this_app_only">This app only</option><option value="external_qbank">External qbank</option></select></label>
          <label className="field"><span>Rationale style</span><select value={preferences.rationaleStyle} onChange={(e) => setPreferences({ ...preferences, rationaleStyle: e.target.value })}><option value="why_correct_and_why_wrong">Why correct + why wrong</option><option value="short_tutor">Short tutor explanation</option><option value="pn_scope_safety">PN scope/safety lens</option></select></label>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric"><CalendarDays /><span>Time today</span><strong>{plan.totalMinutes} min</strong><small>{plan.examCountdownDays === null ? "no exam date" : `${plan.examCountdownDays} days to exam`}</small></div>
        <div className="metric"><span>Questions</span><strong>{plan.questionTarget.minimum}-{plan.questionTarget.maximum}</strong><small>targeted, not random grind</small></div>
        <div className="metric"><ShieldCheck /><span>Focus</span><strong>{plan.focusAreas.slice(0, 2).join(" · ") || "Diagnostic"}</strong><small>from journal/weak areas</small></div>
      </div>

      <div className="review-list">
        {plan.blocks.map((block, index) => (
          <article className="review-card" key={`${block.type}-${index}`}>
            <div className="question-meta"><span>{block.type.replaceAll("_", " ")}</span><span>{block.minutes} min</span></div>
            <h2>{block.task}</h2>
            {block.steps?.length > 0 && <ul>{block.steps.map((step) => <li key={step}>{step}</li>)}</ul>}
          </article>
        ))}
      </div>
    </section>
  );
}
