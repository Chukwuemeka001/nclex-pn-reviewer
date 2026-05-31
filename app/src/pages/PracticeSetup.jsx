import { useMemo } from "react";
import { Play } from "lucide-react";
import { filterQuestions, getTagOptions } from "../lib/questionLoader";
import { selectAdaptiveQuestion } from "../lib/adaptiveEngine";
import { selectSessionQuestionsWithDiversity, evaluateDiversityFeasibility } from "../lib/sessionDiversity";

const modes = [
  "Tutor Practice",
  "Timed Practice",
  "Tagged Practice",
  "Question Type Drill",
  "CAT-Style Adaptive Exam Lite",
  "Weak Area Drill placeholder",
  "Daily Study Plan placeholder",
];

function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Any</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MultiSelect({ label, values, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select multiple value={values} onChange={(event) => onChange([...event.target.selectedOptions].map((option) => option.value))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default function PracticeSetup({ questions, setup, setSetup, onStart }) {
  const filtered = useMemo(() => filterQuestions(questions, setup), [questions, setup]);
  const selected = useMemo(
    () => selectSessionQuestionsWithDiversity(filtered, Number(setup.numberOfQuestions || 10)),
    [filtered, setup.numberOfQuestions],
  );
  const feasibility = useMemo(() => evaluateDiversityFeasibility(filtered), [filtered]);

  const tagOptions = {
    clientNeedsCategory: getTagOptions(questions, "clientNeedsCategory"),
    clientNeedsSubcategory: getTagOptions(questions, "clientNeedsSubcategory"),
    clinicalJudgmentStep: getTagOptions(questions, "clinicalJudgmentStep"),
    questionType: getTagOptions(questions, "questionType"),
    difficulty: getTagOptions(questions, "difficulty"),
    topicTags: getTagOptions(questions, "topicTags"),
    populationTags: getTagOptions(questions, "populationTags"),
    safetyTags: getTagOptions(questions, "safetyTags"),
    skillTags: getTagOptions(questions, "skillTags"),
    bodySystemTags: getTagOptions(questions, "bodySystemTags"),
  };

  function update(key, value) {
    setSetup((current) => ({ ...current, [key]: value }));
  }

  function buildSession() {
    const adaptive = setup.mode === "CAT-Style Adaptive Exam Lite";
    const firstQuestion = adaptive ? selectAdaptiveQuestion(filtered, new Set(), 3) : null;
    onStart({
      id: crypto.randomUUID(),
      questions: adaptive && firstQuestion ? [firstQuestion] : selected,
      pool: filtered,
      adaptive,
      currentDifficulty: 3,
      adaptiveHistory: [],
      startedAt: Date.now(),
    });
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Practice setup</p>
          <h1>Build a question set</h1>
        </div>
        <button className="primary-btn" disabled={!filtered.length} onClick={buildSession}>
          <Play size={18} /> Start {Math.min(selected.length, setup.numberOfQuestions)}
        </button>
      </div>

      <div className="setup-grid">
        <label className="field wide"><span>Mode</span><select value={setup.mode} onChange={(e) => update("mode", e.target.value)}>{modes.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
        <Select label="Client Needs category" value={setup.clientNeedsCategory} onChange={(v) => update("clientNeedsCategory", v)} options={tagOptions.clientNeedsCategory} />
        <Select label="Client Needs subcategory" value={setup.clientNeedsSubcategory} onChange={(v) => update("clientNeedsSubcategory", v)} options={tagOptions.clientNeedsSubcategory} />
        <Select label="Clinical Judgment step" value={setup.clinicalJudgmentStep} onChange={(v) => update("clinicalJudgmentStep", v)} options={tagOptions.clinicalJudgmentStep} />
        <Select label="Question type" value={setup.questionType} onChange={(v) => update("questionType", v)} options={tagOptions.questionType} />
        <Select label="Difficulty" value={setup.difficulty} onChange={(v) => update("difficulty", v)} options={tagOptions.difficulty} />
        <MultiSelect label="Topic tags" values={setup.topicTags} onChange={(v) => update("topicTags", v)} options={tagOptions.topicTags} />
        <MultiSelect label="Population tags" values={setup.populationTags} onChange={(v) => update("populationTags", v)} options={tagOptions.populationTags} />
        <MultiSelect label="Safety tags" values={setup.safetyTags} onChange={(v) => update("safetyTags", v)} options={tagOptions.safetyTags} />
        <MultiSelect label="Skill tags" values={setup.skillTags} onChange={(v) => update("skillTags", v)} options={tagOptions.skillTags} />
        <MultiSelect label="Body system tags" values={setup.bodySystemTags} onChange={(v) => update("bodySystemTags", v)} options={tagOptions.bodySystemTags} />
        <label className="field"><span>Number of questions</span><input type="number" min="1" max="100" value={setup.numberOfQuestions} onChange={(e) => update("numberOfQuestions", e.target.value)} /></label>
        <label className="toggle"><input type="checkbox" checked={setup.tutorMode} onChange={(e) => update("tutorMode", e.target.checked)} /> Tutor mode</label>
        <label className="toggle"><input type="checkbox" checked={setup.timedMode} onChange={(e) => update("timedMode", e.target.checked)} /> Timed mode</label>
      </div>

      <div className="setup-footer">
        <strong>{filtered.length}</strong> matching questions available
        {!feasibility.noAdjacentAchievable && filtered.length > 0 && (
          <p className="help-text">Narrow filter — some related questions may appear close together.</p>
        )}
      </div>
    </section>
  );
}
