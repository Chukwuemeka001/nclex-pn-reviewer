import { ArrowRight, Clock, Database, ShieldCheck } from "lucide-react";

export default function Dashboard({ bank, lastResult, onStart }) {
  const usingApproved = bank.source === "approved-api" || bank.source === "approved-bundled";

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Local practice engine</p>
          <h1>NCLEX-PN Quiz Dashboard</h1>
        </div>
        <button className="primary-btn" onClick={onStart}>
          Start Practice <ArrowRight size={18} />
        </button>
      </div>

      <div className={usingApproved ? "approved-banner" : "demo-banner"}>
        {usingApproved ? `Using approved question bank. Approved question count: ${bank.approvedCount}.` : "Using demo seed questions."}
      </div>

      <div className="metrics-grid">
        <div className="metric"><Database /><span>Question Bank</span><strong>{bank.questions.length}</strong><small>{usingApproved ? "Using approved question bank" : "demo fallback loaded"}</small></div>
        <div className="metric"><ShieldCheck /><span>Source Policy</span><strong>Approved only</strong><small>raw extraction never shown</small></div>
        <div className="metric"><Clock /><span>Last Score</span><strong>{lastResult ? `${lastResult.percentScore}%` : "New"}</strong><small>{lastResult ? `${lastResult.correctCount}/${lastResult.totalQuestions} exact correct` : "no attempt yet"}</small></div>
      </div>

      <div className="mode-grid">
        {["Tutor Practice", "Timed Practice", "Tagged Practice", "Question Type Drill", "CAT-style simulator", "Weak Area Drill placeholder", "Daily Study Plan placeholder"].map((mode) => (
          <div className="mode-row" key={mode}>
            <strong>{mode}</strong>
            <span>{mode.includes("placeholder") ? "Planned workflow" : "Available in setup"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
