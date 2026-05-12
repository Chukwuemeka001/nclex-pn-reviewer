import { useEffect, useMemo, useState } from "react";
import { Flag, Timer, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { scoreQuestion, summarizeAttempt } from "../lib/scoring";
import { abilityEstimatePlaceholder, nextDifficulty, selectAdaptiveQuestion } from "../lib/adaptiveEngine";

export default function QuizPlayer({ session, setup, onFinish, flaggedIds, onToggleFlag }) {
  const [questions, setQuestions] = useState(session.questions);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(session.startedAt || Date.now());
  const [now, setNow] = useState(Date.now());
  const [currentDifficulty, setCurrentDifficulty] = useState(session.currentDifficulty || 3);
  const [adaptiveHistory, setAdaptiveHistory] = useState(session.adaptiveHistory || []);

  const question = questions[index];
  const response = responses[question?.id];
  const elapsedSeconds = Math.round((now - startedAt) / 1000);
  const totalTarget = Number(setup.numberOfQuestions || questions.length);

  useEffect(() => {
    if (!setup.timedMode) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [setup.timedMode]);

  useEffect(() => {
    setSelected(responses[question?.id]?.selectedIndexes || []);
    setSubmitted(Boolean(responses[question?.id]));
  }, [question?.id]);

  const score = useMemo(() => response?.score || (question ? scoreQuestion(question, selected) : null), [question, response, selected]);

  function toggleChoice(choiceIndex) {
    if (submitted) return;
    if (question.itemType === "select_all_that_apply") {
      setSelected((current) => current.includes(choiceIndex) ? current.filter((item) => item !== choiceIndex) : [...current, choiceIndex]);
    } else {
      setSelected([choiceIndex]);
    }
  }

  function submit() {
    const nextScore = scoreQuestion(question, selected);
    const nextResponse = {
      questionId: question.id,
      selectedIndexes: nextScore.selectedIndexes,
      score: nextScore,
      answeredAt: Date.now(),
    };
    setResponses((current) => ({ ...current, [question.id]: nextResponse }));
    setSubmitted(true);

    if (session.adaptive) {
      const difficulty = Number(question.difficulty || currentDifficulty);
      setAdaptiveHistory((current) => [...current, { questionId: question.id, difficulty, correct: nextScore.isCorrect }]);
      setCurrentDifficulty(nextDifficulty(currentDifficulty, nextScore.isCorrect));
    }
  }

  function next() {
    if (session.adaptive && questions.length < totalTarget) {
      const usedIds = new Set(questions.map((item) => item.id));
      const nextQuestion = selectAdaptiveQuestion(session.pool, usedIds, currentDifficulty);
      if (nextQuestion) {
        setQuestions((current) => [...current, nextQuestion]);
        setIndex((current) => current + 1);
        return;
      }
    }
    if (index < questions.length - 1) setIndex(index + 1);
    else finish();
  }

  function finish() {
    const result = summarizeAttempt(questions, responses, startedAt, Date.now());
    result.mode = setup.mode;
    result.tutorMode = setup.tutorMode;
    result.timedMode = setup.timedMode;
    result.flaggedIds = [...flaggedIds];
    result.abilityEstimate = session.adaptive ? abilityEstimatePlaceholder(adaptiveHistory) : null;
    result.catStyleNotice = session.adaptive ? "CAT-style simulator only. This is not the real NCLEX algorithm." : null;
    onFinish(result);
  }

  if (!question) return <section className="page"><h1>No questions available</h1></section>;

  return (
    <section className="page quiz-page">
      <div className="quiz-topbar">
        <span>Question {index + 1} of {session.adaptive ? totalTarget : questions.length}</span>
        <div className="topbar-tools">
          {session.adaptive && <span className="pill">CAT-style simulator · level {currentDifficulty}</span>}
          {setup.timedMode && <span className="pill"><Timer size={15} /> {elapsedSeconds}s</span>}
          <button className={flaggedIds.has(question.id) ? "icon-btn flagged" : "icon-btn"} onClick={() => onToggleFlag(question.id)} aria-label="Flag question"><Flag size={18} /></button>
        </div>
      </div>
      <div className="progress-track"><div style={{ width: `${Math.round(((index + 1) / (session.adaptive ? totalTarget : questions.length)) * 100)}%` }} /></div>

      <article className="question-panel">
        <div className="question-meta">
          <span>{question.itemType === "select_all_that_apply" ? "Select all that apply" : "Multiple choice"}</span>
          <span>Difficulty {question.difficulty}</span>
        </div>
        <h1>{question.stem}</h1>
        <div className="choices">
          {question.choices.map((choice, choiceIndex) => {
            const chosen = selected.includes(choiceIndex);
            const correct = submitted && question.correctAnswerIndexes.includes(choiceIndex);
            const wrong = submitted && chosen && !correct;
            return (
              <button
                key={choice}
                className={`choice ${chosen ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
                onClick={() => toggleChoice(choiceIndex)}
              >
                <span>{String.fromCharCode(65 + choiceIndex)}</span>
                {choice}
              </button>
            );
          })}
        </div>
      </article>

      {submitted && (
        <div className={score.isCorrect ? "feedback correct" : "feedback wrong"}>
          {score.isCorrect ? <CheckCircle2 /> : <XCircle />}
          <div>
            <strong>{score.isCorrect ? "Correct" : "Not quite"}</strong>
            <p>Raw score: {score.rawScore}/{score.maxScore}</p>
            {setup.tutorMode && <p>{question.rationale}</p>}
            {setup.tutorMode && question.whyWrong?.length > 0 && (
              <ul>{question.whyWrong.map((item) => <li key={item}>{item}</li>)}</ul>
            )}
          </div>
        </div>
      )}

      <div className="quiz-actions">
        {!submitted ? (
          <button className="primary-btn" disabled={!selected.length} onClick={submit}>Submit answer</button>
        ) : (
          <button className="primary-btn" onClick={next}>{index + 1 >= totalTarget ? "Finish" : "Next"} <ArrowRight size={18} /></button>
        )}
      </div>
    </section>
  );
}
