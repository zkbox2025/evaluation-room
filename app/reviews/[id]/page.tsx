// app/reviews/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { ReviewDiffForId } from "@/components/ai/ReviewDiffForId.server";


type Props = {
  params: Promise<{ id: string }>;
};

function ScoreChips({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(scores).map(([k, v]) => (
        <span
          key={k}
          className="text-xs bg-gray-50 border border-gray-100 rounded-full px-2 py-1"
        >
          {k}:{v}
        </span>
      ))}
    </div>
  );
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;

  const viewer = await getOrCreateViewer();
  if (!viewer) {
    return (
      <main className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-2xl font-semibold">レビュー詳細</h1>
        <p className="mt-4 text-sm text-gray-600">
          Cookieが無効だと閲覧者（viewer）を特定できません。Cookieを有効にして再読み込みしてください。
        </p>
      </main>
    );
  }

  // 1件取得（viewerのものだけ見せる）
  const review = await prisma.aiReview.findFirst({
    where: { id, viewerId: viewer.id },
  });

  if (!review) {
    return (
      <main className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-2xl font-semibold">レビュー詳細</h1>
        <p className="mt-4 text-sm text-gray-600">レビューが見つかりません。</p>
        <Link href="/reviews" className="inline-block mt-6 text-blue-600 underline">
          履歴一覧へ
        </Link>
      </main>
    );
  }

  const rj: unknown = review.resultJson;
  const obj: Record<string, unknown> | null =
  rj && typeof rj === "object" ? (rj as Record<string, unknown>) : null;

  const summary = typeof obj?.summary === "string" ? obj.summary : null;

  const scores =
  obj?.scores && typeof obj.scores === "object"
    ? (obj.scores as Record<string, number>)
    : null;

  const issues = Array.isArray(obj?.issues) ? (obj!.issues as unknown[]) : null;
  const nextActions = Array.isArray(obj?.nextActions) ? (obj!.nextActions as unknown[]) : null;
  const goodPoints = Array.isArray(obj?.goodPoints) ? (obj!.goodPoints as unknown[]) : null;

  const targetLabel =
    review.targetType === "person"
      ? `person/${review.targetKey ?? ""}`
      : review.targetType;

  const backToTargetHref =
    review.targetType === "person"
      ? `/reviews/person/${review.targetKey}`
      : `/reviews/${review.targetType}`;

  return (
    <main className="max-w-4xl mx-auto py-16 px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">レビュー詳細</h1>
          <p className="mt-2 text-sm text-gray-600">
            {new Date(review.createdAt).toLocaleString("ja-JP")} /{" "}
            <span className="font-mono">{targetLabel}</span> /{" "}
            <span className={review.status === "success" ? "text-green-700" : "text-red-700"}>
              {review.status}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            model: {review.model} / promptVersion: {review.promptVersion} / schemaVersion: {review.schemaVersion}
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <Link href="/reviews" className="text-sm text-blue-600 underline">
            一覧へ
          </Link>
          <Link href={backToTargetHref} className="text-sm text-blue-600 underline">
            ターゲット別へ
          </Link>
        </div>
      </div>

      {/* error */}
      {review.status === "error" ? (
  <div className="mt-8 bg-white border border-gray-100 rounded-xl p-4">
    <p className="text-xs text-gray-500">errorMessage</p>
    <p className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
      {review.errorMessage ?? "不明なエラー"}
    </p>

    <p className="mt-4 text-xs text-gray-500">inputSnapshot（参考）</p>
    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto">
      {JSON.stringify(review.inputSnapshot, null, 2)}
    </pre>

    <p className="mt-4 text-xs text-gray-500">resultJson（Raw / 検証用）</p>
    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto">
      {JSON.stringify(review.resultJson, null, 2)}
    </pre>
  </div>
) : (
  <>
          {/* summary */}
          {summary && (
            <section className="mt-8 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Summary</h2>
              <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{summary}</p>
            </section>
          )}

          {/* scores */}
          {scores && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Scores</h2>
              <div className="mt-2">
                <ScoreChips scores={scores} />
              </div>
            </section>
          )}

          {/* goodPoints */}
          {goodPoints && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Good Points</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-800">
                {goodPoints.map((p: unknown, idx: number) => (
               <li key={idx}>{String(p)}</li>
            ))}
              </ul>
            </section>
          )}

          {/* issues */}
          {issues && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Issues</h2>
              <div className="mt-3 space-y-3">
                {issues.map((i: unknown, idx: number) => {
  const issue = i && typeof i === "object" ? (i as Record<string, unknown>) : null;

  return (
    <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{String(issue?.title ?? "")}</p>
        <span className="text-xs text-gray-500">{String(issue?.severity ?? "")}</span>
      </div>
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
        {String(issue?.detail ?? "")}
      </p>
      <p className="mt-2 text-xs text-gray-600">
        <span className="font-semibold">Fix:</span> {String(issue?.fix ?? "")}
      </p>
    </div>
  );
})}
              </div>
            </section>
          )}

          {/* next actions */}
          {nextActions && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Next Actions</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-800">
              {nextActions.map((a: unknown, idx: number) => (
              <li key={idx}>{String(a)}</li>
              ))}  
              </ul>
            </section>
          )}

          {/* raw JSON (fallback/inspection) */}
          <section className="mt-6">
            <details className="bg-white border border-gray-100 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Raw JSON（検証用）
              </summary>
              <pre className="mt-3 text-xs bg-gray-50 p-3 rounded overflow-auto">
                {JSON.stringify(review.resultJson, null, 2)}
              </pre>
            </details>
          </section>
        </>
      )}
{viewer && (
  <section className="mt-16">
    <h2 className="text-lg font-semibold mb-4">前回レビューとの差分</h2>
    <ReviewDiffForId viewerId={viewer.id} reviewId={review.id} />
  </section>
)}

    </main>
  );
}