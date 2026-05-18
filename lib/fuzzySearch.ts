export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.startsWith(b) || b.startsWith(a)) return 0.88;
  // Short words (≤4 chars): exact/prefix only — avoid "bull"≈"full" false positives
  if (Math.min(a.length, b.length) <= 4) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const sim = 1 - dist / maxLen;
  // Only count as a match if similarity is strong enough
  return sim >= 0.7 ? sim : 0;
}

export function scoreMatch(query: string, target: string): number {
  const queryTokens = tokenize(query);
  const targetTokens = tokenize(target);

  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;

  // Exact substring match: fast path with strong score
  if (target.toLowerCase().includes(query.toLowerCase())) return 0.95;

  let totalScore = 0;
  let anyTokenMatched = false;

  for (const qt of queryTokens) {
    let best = 0;
    for (const tt of targetTokens) {
      const sim = wordSimilarity(qt, tt);
      if (sim > best) best = sim;
    }
    if (best > 0) anyTokenMatched = true;
    totalScore += best;
  }

  // If no token matched at all, reject immediately
  if (!anyTokenMatched) return 0;

  return totalScore / queryTokens.length;
}
