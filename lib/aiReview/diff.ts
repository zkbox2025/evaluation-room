// src/lib/aiReview/diff.ts
//差分計算関数（scores増減＋issues件数差)

type ReviewJson = unknown;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asScores(resultJson: ReviewJson): Record<string, number> | null {
  if (!isRecord(resultJson)) return null;

  const s = resultJson.scores;
  if (!isRecord(s)) return null;

  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    const n = typeof v === "number" ? v : Number(v); // "8" みたいな文字列も許容
    if (Number.isFinite(n)) out[k] = n;
  }
  return Object.keys(out).length ? out : null;
}

function issueCount(resultJson: ReviewJson): number {
  if (!isRecord(resultJson)) return 0;

  const issues = resultJson.issues;
  return Array.isArray(issues) ? issues.length : 0;
}

export function diffReview(latestJson: ReviewJson, prevJson: ReviewJson) {
  const latestScores = asScores(latestJson) ?? {};
  const prevScores = asScores(prevJson) ?? {};

  const deltas: Array<{ key: string; delta: number; latest: number; prev: number }> = [];

  for (const key of Object.keys(latestScores)) {
    const latest = latestScores[key] ?? 0;
    const prev = prevScores[key] ?? 0;
    deltas.push({ key, delta: latest - prev, latest, prev });
  }

  const latestIssues = issueCount(latestJson);
  const prevIssues = issueCount(prevJson);

  return {
    scoreDeltas: deltas,
    issuesDelta: latestIssues - prevIssues,
    latestIssues,
    prevIssues,
  };
}