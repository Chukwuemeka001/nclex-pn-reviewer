import { assessSingleAnswerPositionBalance } from "./questionIntegrity.js";

function seededHash(value = "") {
  const text = String(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rotateArray(values, shift) {
  const n = values.length;
  if (!n) return [];
  const s = ((shift % n) + n) % n;
  if (s === 0) return [...values];
  return [...values.slice(s), ...values.slice(0, s)];
}

function permuteSingleAnswerItem(item, newCorrectIndex) {
  const oldChoices = Array.isArray(item.answerChoices) ? item.answerChoices : [];
  const oldWhyWrong = Array.isArray(item.whyWrong) ? item.whyWrong : [];
  const oldCorrectIndex = Number(item.correctAnswerIndexes?.[0]);

  if (!Number.isInteger(oldCorrectIndex) || oldCorrectIndex < 0 || oldCorrectIndex >= oldChoices.length) {
    return { ...item };
  }

  const shift = oldCorrectIndex - newCorrectIndex;
  const choices = rotateArray(oldChoices, shift);
  const whyWrong = oldWhyWrong.length === oldChoices.length ? rotateArray(oldWhyWrong, shift) : oldWhyWrong;

  const next = {
    ...item,
    answerChoices: choices,
    correctAnswerIndexes: [newCorrectIndex],
    correctAnswerText: [choices[newCorrectIndex]],
  };

  if (Array.isArray(whyWrong) && whyWrong.length === choices.length) {
    next.whyWrong = whyWrong;
  }

  const keyText = next.answerChoices?.[newCorrectIndex] || "";
  if (next.correctAnswerText?.[0] !== keyText) {
    throw new Error(`answer-key text mismatch after rebalance for ${item.id || "unknown"}`);
  }

  if (Array.isArray(next.whyWrong) && next.whyWrong.length === next.answerChoices.length) {
    const atKey = String(next.whyWrong[newCorrectIndex] ?? "").trim();
    if (atKey !== "") {
      throw new Error(`whyWrong correct-index slot not blank after rebalance for ${item.id || "unknown"}`);
    }
  }

  return next;
}

export function rebalanceAnswerKeys(items = [], { maxShare = 0.4, minDistinct = 3 } = {}) {
  const cloned = items.map((item) => ({ ...item }));
  const singles = cloned
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => Array.isArray(item.correctAnswerIndexes) && item.correctAnswerIndexes.length === 1 && Array.isArray(item.answerChoices) && item.answerChoices.length >= 2);

  if (singles.length < 6) return cloned;

  const counts = new Map();
  for (const { item } of singles) {
    const k = Number(item.correctAnswerIndexes[0]);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const total = singles.length;
  const maxAllowed = Math.floor(maxShare * total);
  const target = Math.ceil(total / 4);

  const ordered = [...singles].sort((a, b) => {
    const ha = seededHash(a.item.id || a.idx);
    const hb = seededHash(b.item.id || b.idx);
    return ha - hb;
  });

  const desiredCycle = [0, 1, 2, 3];
  for (const { item, idx } of ordered) {
    const current = Number(item.correctAnswerIndexes[0]);
    const rankedTargets = [...desiredCycle].sort((a, b) => {
      const ca = counts.get(a) || 0;
      const cb = counts.get(b) || 0;
      if (ca !== cb) return ca - cb;
      const ta = Math.abs((counts.get(a) || 0) - target);
      const tb = Math.abs((counts.get(b) || 0) - target);
      if (ta !== tb) return ta - tb;
      return a - b;
    });

    const chosen = rankedTargets.find((t) => {
      if (t === current) return true;
      const projectedCurrent = (counts.get(current) || 0) - 1;
      const projectedTarget = (counts.get(t) || 0) + 1;
      return projectedTarget <= Math.max(maxAllowed, target) && projectedCurrent >= 0;
    }) ?? current;

    if (chosen !== current) {
      counts.set(current, (counts.get(current) || 0) - 1);
      counts.set(chosen, (counts.get(chosen) || 0) + 1);
      cloned[idx] = permuteSingleAnswerItem(item, chosen);
    }
  }

  const balance = assessSingleAnswerPositionBalance(cloned, { maxShare, minDistinct });
  if (!balance.passed) {
    throw new Error(`rebalance failed to satisfy distribution gate: ${balance.issues.join("; ")}`);
  }

  return cloned;
}
