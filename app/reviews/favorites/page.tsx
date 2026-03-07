import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { extractReviewBits } from "@/lib/aiReview/ui";
import { RunAiReviewButton } from "@/components/ai/RunAiReviewButton";

export default async function ReviewsFavoritesPage() {
  const viewer = await getOrCreateViewer();
  if (!viewer) return <p className="p-6">Cookieを有効にしてください。</p>;

  const reviews = await prisma.aiReview.findMany({
    where: { viewerId: viewer.id, targetType: "favorites" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
  <main className="max-w-4xl mx-auto py-16 px-6">
    <div className="flex items-start justify-between">
      <h1 className="text-2xl font-semibold">Favoritesのレビュー履歴</h1>

      <div className="flex flex-col items-end gap-2">
        <RunAiReviewButton
          target={{ type: "favorites" }}
          pathToRevalidate="/reviews/favorites"
          label="AIレビューを実行"
        />
        <Link href="/reviews" className="text-sm text-blue-600 underline">
          一覧へ
        </Link>
      </div>
    </div>

      <div className="mt-8 space-y-3">
        {reviews.map((r) => {
          const { summary, scores, issuesTop3 } = extractReviewBits(r.resultJson);
          return (
            <details key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between">
  <div className="text-sm">
    {new Date(r.createdAt).toLocaleString("ja-JP")}
  </div>

  {/* 右側かたまり */}
  <div className="flex items-center gap-3">
    <span className="text-xs text-gray-500">{r.status}</span>

    <Link
      href={`/reviews/${r.id}`}
      className="text-xs text-blue-600 underline"
    >
      詳細
    </Link>
  </div>
</div>
              </summary>

              <div className="mt-4 text-sm">
                {r.status === "error" ? (
                  <p className="text-red-700 whitespace-pre-wrap">{r.errorMessage}</p>
                ) : (
                  <>
                    {summary && <p className="whitespace-pre-wrap">{summary}</p>}
                    {scores && (
                      <p className="mt-2 text-xs text-gray-600">
                        {Object.entries(scores).map(([k, v]) => `${k}:${v}`).join(" / ")}
                      </p>
                    )}
                    {issuesTop3?.length ? (
                      <ul className="mt-2 list-disc pl-5">
                        {issuesTop3.map((i, idx) => (
                          <li key={idx}>
                            {i.severity} {i.title}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}