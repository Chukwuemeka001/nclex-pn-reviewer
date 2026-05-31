import { deriveQuestionFamilyKey, normalizeText } from "./familyKey.js";

export { deriveQuestionFamilyKey, normalizeText } from "./familyKey.js";

function stemSignature(q = {}) {
  return normalizeText(q.stem || q.newStem || "");
}

function bucketByFamily(pool = []) {
  const buckets = new Map();
  const order = [];
  for (const q of pool) {
    const f = deriveQuestionFamilyKey(q);
    if (!buckets.has(f)) {
      buckets.set(f, []);
      order.push(f);
    }
    buckets.get(f).push(q);
  }
  return { buckets, order };
}

function selectDiverseSubset(pool = [], target = 0) {
  const { buckets, order } = bucketByFamily(pool);

  for (const f of order) {
    const seen = new Set();
    const uniq = [];
    const dup = [];
    for (const q of buckets.get(f)) {
      const s = stemSignature(q);
      if (seen.has(s)) dup.push(q);
      else {
        seen.add(s);
        uniq.push(q);
      }
    }
    buckets.set(f, [...uniq, ...dup]);
  }

  const picked = [];
  let progressed = true;
  while (picked.length < target && progressed) {
    progressed = false;
    for (const f of order) {
      if (picked.length >= target) break;
      const q = buckets.get(f).shift();
      if (q) {
        picked.push(q);
        progressed = true;
      }
    }
  }
  return picked;
}

function arrangeMinRun(items = []) {
  if (items.length <= 1) return items;

  const { buckets, order } = bucketByFamily(items);
  const rank = new Map(order.map((family, idx) => [family, idx]));

  const families = [...order].sort((a, b) => {
    const d = buckets.get(b).length - buckets.get(a).length;
    return d !== 0 ? d : rank.get(a) - rank.get(b);
  });

  const dominant = families[0];
  const domItems = buckets.get(dominant);
  const m = domItems.length;

  const restFamilies = families.slice(1);
  const rest = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const f of restFamilies) {
      const q = buckets.get(f).shift();
      if (q) {
        rest.push(q);
        progressed = true;
      }
    }
  }

  const slots = rest.length + 1;
  const base = Math.floor(m / slots);
  const extra = m % slots;

  const result = [];
  let di = 0;
  for (let i = 0; i < slots; i += 1) {
    const chunk = base + (i < extra ? 1 : 0);
    for (let c = 0; c < chunk; c += 1) result.push(domItems[di++]);
    if (i < rest.length) result.push(rest[i]);
  }

  return result;
}

export function maxAdjacentFamilyRun(questions = []) {
  if (!questions.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < questions.length; i += 1) {
    const prev = deriveQuestionFamilyKey(questions[i - 1]);
    const cur = deriveQuestionFamilyKey(questions[i]);
    if (prev === cur) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function countFamilies(pool = []) {
  const counts = new Map();
  for (const q of pool) {
    const family = deriveQuestionFamilyKey(q);
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  return counts;
}

function isNoAdjacentAchievable(pool = []) {
  if (!pool.length) return true;
  const counts = countFamilies(pool);
  const maxCount = Math.max(...counts.values());
  return maxCount <= Math.ceil(pool.length / 2);
}

export function selectSessionQuestionsWithDiversity(pool = [], requestedCount = 10) {
  const target = Math.max(1, Number(requestedCount || 10));
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const subset = selectDiverseSubset(pool, Math.min(target, pool.length));
  return arrangeMinRun(subset);
}

export function evaluateDiversityFeasibility(pool = []) {
  const counts = countFamilies(pool);
  const maxCount = counts.size ? Math.max(...counts.values()) : 0;
  return {
    poolSize: pool.length,
    familyCount: counts.size,
    maxFamilyCount: maxCount,
    noAdjacentAchievable: isNoAdjacentAchievable(pool),
  };
}
