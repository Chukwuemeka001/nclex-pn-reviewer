import { BarChart3, BookOpen, RotateCcw } from "lucide-react";
import { performanceByTags, recommendedNextSet, weakestAreas } from "../lib/tagAnalytics";

function StatTable({ title, rows }) {
  return (
    <div className="table-card">
      <h2>{title}</h2>
      {Object.entries(rows || {}).map(([label, stats]) => (
        <div className="stat-row" key={label}><span>{label}</span><strong>{stats.percent}%</strong><small>{stats.correct}/{stats.total}</small></div>
      ))}
    </div>
  );
}

export default function Results({ result, onReview, onPractice }) {
  const performance = performanceByTags(result.scored);
  const weak = weakestAreas(performance);
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Results</p>
          <h1>{result.percentScore}% overall</h1>
        </div>
        <div className="button-row">
          <button className="secondary-btn" onClick={onReview}><BookOpen size={18} /> Review</button>
          <button className="primary-btn" onClick={onPractice}><RotateCcw size={18} /> New set</button>
        </div>
      </div>
      {result.catStyleNotice && <div className="notice">{result.catStyleNotice} Ability estimate placeholder: {result.abilityEstimate}</div>}
      <div className="metrics-grid">
        <div className="metric"><BarChart3 /><span>Raw score</span><strong>{result.rawScore}/{result.maxScore}</strong><small>{result.correctCount} correct · {result.incorrectCount} incorrect</small></div>
        <div className="metric"><span>Time</span><strong>{result.timeUsedSeconds}s</strong><small>{result.timedMode ? "timed practice" : "untimed"}</small></div>
        <div className="metric"><span>Next</span><strong>{recommendedNextSet(weak)}</strong><small>based on weakest area</small></div>
      </div>
      <div className="analytics-grid">
        <StatTable title="Client Needs" rows={performance.clientNeedsCategory} />
        <StatTable title="Clinical Judgment" rows={performance.clinicalJudgmentStep} />
        <StatTable title="Question Type" rows={performance.questionType} />
        <StatTable title="Topic Tags" rows={performance.topicTags} />
      </div>
      <div className="table-card">
        <h2>Weakest 3 Areas</h2>
        {weak.map((item) => <div className="stat-row" key={`${item.group}-${item.label}`}><span>{item.label}</span><strong>{item.percent}%</strong><small>{item.group}</small></div>)}
      </div>
    </section>
  );
}
