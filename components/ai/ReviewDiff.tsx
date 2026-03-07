"use client";

export function ReviewDiff(props: {
  scoreDeltas: Array<{ key: string; delta: number; latest: number; prev: number }>;
  issuesDelta: number;
  latestIssues: number;
  prevIssues: number;
}) {
  const { scoreDeltas, issuesDelta, latestIssues, prevIssues } = props;

  const nonZero = scoreDeltas.filter((d) => d.delta !== 0);

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="text-sm font-semibold">前回との差分</h3>

      <div className="mt-2 text-sm text-gray-800">
        <p className="text-xs text-gray-500">scores</p>
        {nonZero.length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">変化なし</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {nonZero.map((d) => (
              <span
                key={d.key}
                className="text-xs rounded-full border border-gray-100 bg-gray-50 px-2 py-1"
              >
                {d.key} {d.delta > 0 ? `+${d.delta}` : `${d.delta}`}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-800">
        <p className="text-xs text-gray-500">issues</p>
        <p className="mt-1">
          {prevIssues} → {latestIssues}（
          {issuesDelta > 0 ? `+${issuesDelta}` : `${issuesDelta}`}）
        </p>
      </div>
    </div>
  );
}