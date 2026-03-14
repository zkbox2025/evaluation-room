import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { extractReviewBits } from "@/lib/aiReview/ui";//AIレビュー結果（resultJson）から、画面で使いたい一部（summary,scores,issues先頭3件）だけ安全に抜き出す関数
import { RunAiReviewButton } from "@/components/ai/RunAiReviewButton";
import { TargetReviewDiff } from "@/components/ai/TargetReviewDiff.server";//レビュー結果の差分(前後比較)を出す司令塔
import { withReviewsSecret } from "@/lib/aiReview/secretLink"; // ★修正箇所はここ！

type Props = {
searchParams?: Promise<{ secret?: string }>;// ★修正箇所はここ！//引数(props)の型を定義する（params:URLからsecretを抜き取り引数とする）
};

export default async function ReviewsTopPage({ searchParams }: Props) {
const { secret } = (await searchParams) ?? {}; // ★修正箇所はここ！

  const viewer = await getOrCreateViewer();//deviceIDからviewer（viewerID入り）を特定
  if (!viewer) return <p className="p-6">Cookieを有効にしてください。</p>;//なければ表示

  //同じviewerIdでありtargetType:"top"であるデータを新しい順に並べ替えて、上から30件取得する
  const reviews = await prisma.aiReview.findMany({
    where: { viewerId: viewer.id, targetType: "top" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const backToListHref = withReviewsSecret("/reviews", secret); // ★修正箇所はここ！

  return (//ページ全体のレイアウトのリターン
    <main className="max-w-4xl mx-auto py-16 px-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">Top のレビュー履歴</h1>
        <div className="flex flex-col items-end gap-2">
          <RunAiReviewButton
             target={{ type: "top" }}
             pathToRevalidate="/reviews/top"
             label="AIレビューを実行"
           />
        <Link href={backToListHref} className="text-sm text-blue-600 underline">
          一覧へ
        </Link>
      </div>
      </div>

      <div className="mt-8 space-y-3">
        {reviews.map((r) => {
          const { summary, scores, issuesTop3 } = extractReviewBits(r.resultJson);
          const detailHref = withReviewsSecret(`/reviews/${r.id}`, secret); // ★修正箇所はここ！


          return (//レビューごとにの1項目ずつを返している
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
      href={detailHref}
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
        {viewer && (
          <section className="mt-16">
            <h2 className="text-lg font-semibold mb-4">前回レビューとの差分</h2>
            <TargetReviewDiff viewerId={viewer.id} targetType="top" />
          </section>
        )}
      </div>
    </main>
  );
}