export default function Review({ result, flaggedIds, onPractice }) {
  if (!result) {
    return <section className="page empty-state"><h1>No completed attempt yet</h1><button className="primary-btn" onClick={onPractice}>Start practice</button></section>;
  }
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Question review</p>
          <h1>Review attempt</h1>
        </div>
      </div>
      <div className="review-list">
        {result.scored.map(({ question, score, response }, idx) => (
          <article className="review-card" key={question.id}>
            <div className="question-meta">
              <span>Question {idx + 1}</span>
              <span>{score.isCorrect ? "Correct" : "Incorrect"}</span>
              {flaggedIds.has(question.id) && <span>Flagged</span>}
            </div>
            <h2>{question.stem}</h2>
            <div className="choices compact">
              {question.choices.map((choice, choiceIndex) => (
                <div className={`choice static ${question.correctAnswerIndexes.includes(choiceIndex) ? "correct" : ""} ${response.selectedIndexes?.includes(choiceIndex) ? "selected" : ""}`} key={choice}>
                  <span>{String.fromCharCode(65 + choiceIndex)}</span>{choice}
                </div>
              ))}
            </div>
            <p className="rationale">{question.rationale}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
