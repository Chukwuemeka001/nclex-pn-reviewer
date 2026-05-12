export function difficultyFromQuestion(question) {
  return Math.min(5, Math.max(1, Number(question.difficulty || 3)));
}

export function nextDifficulty(currentDifficulty, wasCorrect) {
  return Math.min(5, Math.max(1, currentDifficulty + (wasCorrect ? 1 : -1)));
}

export function selectAdaptiveQuestion(availableQuestions, usedIds, targetDifficulty) {
  const unused = availableQuestions.filter((question) => !usedIds.has(question.id));
  if (!unused.length) return null;
  return unused
    .map((question) => ({
      question,
      distance: Math.abs(difficultyFromQuestion(question) - targetDifficulty),
    }))
    .sort((a, b) => a.distance - b.distance || difficultyFromQuestion(b.question) - difficultyFromQuestion(a.question))[0].question;
}

export function abilityEstimatePlaceholder(history) {
  if (!history.length) return 2.5;
  const avgDifficulty = history.reduce((sum, item) => sum + item.difficulty, 0) / history.length;
  const accuracy = history.filter((item) => item.correct).length / history.length;
  return Number(Math.min(5, Math.max(1, avgDifficulty + (accuracy - 0.5))).toFixed(2));
}
