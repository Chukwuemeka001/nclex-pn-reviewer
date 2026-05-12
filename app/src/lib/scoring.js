function sorted(values) {
  return [...values].map(Number).sort((a, b) => a - b);
}

export function scoreQuestion(question, selectedIndexes) {
  const selected = new Set(selectedIndexes.map(Number));
  const correct = new Set(question.correctAnswerIndexes.map(Number));

  if (question.itemType === "select_all_that_apply") {
    let rawScore = 0;
    for (const index of selected) rawScore += correct.has(index) ? 1 : -1;
    rawScore = Math.max(0, rawScore);
    const maxScore = correct.size || 1;
    const isCorrect = rawScore === maxScore && selected.size === correct.size;
    return {
      isCorrect,
      rawScore,
      maxScore,
      percent: Math.round((rawScore / maxScore) * 100),
      selectedIndexes: sorted(selected),
      correctAnswerIndexes: sorted(correct),
    };
  }

  const isCorrect = selected.size === 1 && correct.size === 1 && selected.has([...correct][0]);
  return {
    isCorrect,
    rawScore: isCorrect ? 1 : 0,
    maxScore: 1,
    percent: isCorrect ? 100 : 0,
    selectedIndexes: sorted(selected),
    correctAnswerIndexes: sorted(correct),
  };
}

export function summarizeAttempt(questions, responses, startedAt, endedAt) {
  const scored = questions.map((question) => {
    const response = responses[question.id] || {};
    const score = response.score || scoreQuestion(question, response.selectedIndexes || []);
    return { question, response, score };
  });
  const rawScore = scored.reduce((sum, item) => sum + item.score.rawScore, 0);
  const maxScore = scored.reduce((sum, item) => sum + item.score.maxScore, 0);
  const correctCount = scored.filter((item) => item.score.isCorrect).length;
  return {
    rawScore,
    maxScore,
    percentScore: maxScore ? Math.round((rawScore / maxScore) * 100) : 0,
    correctCount,
    incorrectCount: scored.length - correctCount,
    totalQuestions: scored.length,
    timeUsedSeconds: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    scored,
  };
}
