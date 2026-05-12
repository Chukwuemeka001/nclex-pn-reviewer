function tagLabel(tag) {
  return tag?.label || tag?.id || "Untagged";
}

function collectBuckets(question) {
  return {
    clientNeedsCategory: [question.tagging?.clientNeedsCategory].filter(Boolean),
    clinicalJudgmentStep: [question.tagging?.clinicalJudgmentStep].filter(Boolean),
    questionType: [question.tagging?.questionType].filter(Boolean),
    topicTags: question.tagging?.topicTags || [],
  };
}

export function performanceByTags(scored) {
  const buckets = {};
  for (const item of scored) {
    const grouped = collectBuckets(item.question);
    for (const [group, tags] of Object.entries(grouped)) {
      buckets[group] ||= {};
      for (const tag of tags) {
        const label = tagLabel(tag);
        buckets[group][label] ||= { correct: 0, total: 0, rawScore: 0, maxScore: 0 };
        buckets[group][label].total += 1;
        buckets[group][label].correct += item.score.isCorrect ? 1 : 0;
        buckets[group][label].rawScore += item.score.rawScore;
        buckets[group][label].maxScore += item.score.maxScore;
      }
    }
  }
  for (const group of Object.values(buckets)) {
    for (const stats of Object.values(group)) {
      stats.percent = stats.maxScore ? Math.round((stats.rawScore / stats.maxScore) * 100) : 0;
    }
  }
  return buckets;
}

export function weakestAreas(performance, limit = 3) {
  return Object.entries(performance)
    .flatMap(([group, tags]) => Object.entries(tags).map(([label, stats]) => ({ group, label, ...stats })))
    .filter((item) => item.total > 0)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, limit);
}

export function recommendedNextSet(weakAreas) {
  if (!weakAreas.length) return "Repeat a mixed tutor set to reinforce retention.";
  const area = weakAreas[0];
  return `Run a 10-question tutor drill focused on ${area.label}.`;
}
