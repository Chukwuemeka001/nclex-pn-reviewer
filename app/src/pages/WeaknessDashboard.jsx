import { Target } from "lucide-react";
import { performanceByTags, weakestAreas, recommendedNextSet } from "../lib/tagAnalytics";

export default function WeaknessDashboard({ result, onPractice }) {
  if (!result) {
    return (
      <section className="page empty-state">
        <Target size={36} />
        <h1>Weakness dashboard placeholder</h1>
        <p>Complete a practice set to populate weak-area analytics.</p>
        <button className="primary-btn" onClick={onPractice}>Start practice</button>
      </section>
    );
  }
  const weak = weakestAreas(performanceByTags(result.scored), 6);
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Weakness dashboard</p>
          <h1>Focus areas</h1>
        </div>
      </div>
      <div className="table-card">
        <h2>{recommendedNextSet(weak)}</h2>
        {weak.map((item) => (
          <div className="stat-row" key={`${item.group}-${item.label}`}>
            <span>{item.label}</span>
            <strong>{item.percent}%</strong>
            <small>{item.group}</small>
          </div>
        ))}
      </div>
      <div className="notice">Daily Study Plan and Weak Area Drill are placeholders in V1; this page shows the analytics those modes will use.</div>
    </section>
  );
}
