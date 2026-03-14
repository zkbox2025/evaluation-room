// app/reviews/page.tsx（一覧ページ）
import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { extractReviewBits, formatTargetLabel } from "@/lib/aiReview/ui";//AIレビュー結果（resultJson）から、画面で使いたい一部（summary,scores,issues先頭3件）だけ安全に抜き出す関数と、レビュー対象を表示用の文字列にする関数(targetTypeがpersonの場合、person/targetkeyで表示する)
import { withReviewsSecret } from "@/lib/aiReview/secretLink";


type Props = { // ★修正箇所はここ！//引数(props)の型を定義する（params:URLからsecretを抜き取り引数とする）
  searchParams?: Promise<{ secret?: string }>;
};

export default async function ReviewsPage({ searchParams }: Props) {
  const { secret } = (await searchParams) ?? {};

  const viewer = await getOrCreateViewer();//deviceIDからviewer（viewerID入り）を特定
  if (!viewer) {//もしviewer（viewerID入り）がなければ以下を表示
    return (
      <main className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-2xl font-semibold">レビュー履歴</h1>
        <p className="mt-4 text-sm text-gray-600">
          Cookieが無効だと閲覧者（viewer）を特定できません。Cookieを有効にして再読み込みしてください。
        </p>
      </main>
    );
  }

  //同じviewerIDのレビューデータを新しい順に並べて上から30件とってくる
  const reviews = await prisma.aiReview.findMany({
    where: { viewerId: viewer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (//ページ全体のレイアウトのリターン
    <main className="max-w-4xl mx-auto py-16 px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">レビュー履歴</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          トップへ
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-600">まだレビュー履歴がありません。</p>
        ) : (
          reviews.map((r) => {
            const { summary, scores, issuesTop3 } = extractReviewBits(r.resultJson);
            const label = formatTargetLabel(r.targetType, r.targetKey);//targetType=personの場合、person/targetKeyで表示する

            // ★修正箇所はここ！（ターゲット別へリンクにsecret付与）
            const targetHref =
              r.targetType === "person"
                ? withReviewsSecret(`/reviews/person/${r.targetKey}`, secret)
                : withReviewsSecret(`/reviews/${r.targetType}`, secret);

            // ★修正箇所はここ！（詳細へリンクにsecret付与）
            const detailHref = withReviewsSecret(`/reviews/${r.id}`, secret);


            return (//レビューごとにの1項目ずつを返している
              <details key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="text-sm text-gray-800">
                      <span className="font-medium">
                        {new Date(r.createdAt).toLocaleString("ja-JP")}
                      </span>
                      <span className="mx-2 text-gray-400">/</span>
                      <span className="font-mono">{label}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          r.status === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {r.status}
                      </span>

                      <Link className="text-xs text-blue-600 underline" href={targetHref}>
                        ターゲット別へ
                      </Link>
                      <Link className="text-xs text-blue-600 underline" href={detailHref}>
                       詳細へ
                      </Link>
                    </div>
                  </div>
                </summary>

                {/* 展開（details） */}
                <div className="mt-4 space-y-3 text-sm">
                  {r.status === "error" ? (
                    <p className="text-red-700 whitespace-pre-wrap">
                      {r.errorMessage ?? "不明なエラー"}
                    </p>
                  ) : (
                    <>
                      {summary && (
                        <div>
                          <p className="text-xs text-gray-500">summary</p>
                          <p className="mt-1 text-gray-800 whitespace-pre-wrap">{summary}</p>
                        </div>
                      )}

                      {scores && (
                        <div>
                          <p className="text-xs text-gray-500">scores</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {Object.entries(scores).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-xs bg-gray-50 border border-gray-100 rounded-full px-2 py-1"
                              >
                                {k}:{String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {issuesTop3 && issuesTop3.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">issues（top3）</p>
                          <ul className="mt-1 list-disc pl-5 text-gray-800">
                            {issuesTop3.map((i, idx) => (
                              <li key={idx}>
                                <span className="text-xs text-gray-500">{i.severity}</span>{" "}
                                {i.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>
    </main>
  );
}