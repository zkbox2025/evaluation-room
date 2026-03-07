// app/likes/page.tsx
import Link from "next/link";//ページの切り替えを早くするコンポーネント
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";//deviceIDを基にviewer（訪問者）を取得するか、なければ新しく作成する関数をインポートする
import { getEvaluationsByIds } from "@/lib/getEvaluationsByIds";//microCMSからのEvaluationCMS（評価データ）を取得し呼び出しもとが使いやすいように変換して返す関数
import { truncateToPlainText } from "@/viewmodels/formatters";
import { RunAiReviewButton } from "@/components/ai/RunAiReviewButton";

export default async function LikesPage() {//ページ本体

  const viewer = await getOrCreateViewer();// 1) viewerIDを特定

  if (!viewer) {//viewerIDがなければページ終了
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">いいね一覧</h1>
        <p className="mt-4 text-gray-600">
          Cookieが無効の可能性があります。Cookieを有効にして再読み込みしてください。
        </p>
      </main>
    );
  }


  const likes = await prisma.like.findMany({ //2) DBから、このviewerIDがいいねした evaluationId 一覧を取得
    where: { viewerId: viewer.id },//viewerIDを検索
    select: { evaluationId: true, createdAt: true },//evaluationIdとcreatedAtを取得
    orderBy: { createdAt: "desc" },//最新順に並べ替え
  });

  const likedIds = likes.map((l) => l.evaluationId);//いいね済みeavluationIDのみ集めたIDリストを作成

  // いいねが0件なら終了
  if (likedIds.length === 0) {
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">いいね一覧</h1>
        <RunAiReviewButton target={{ type: "likes" }} pathToRevalidate="/likes" />
        <p className="mt-4 text-gray-600">まだいいねがありません。</p>
        <Link className="inline-block mt-6 text-blue-600 underline" href="/">
          トップへ戻る
        </Link>
      </main>
    );
  }

  // 3) microCMSからevaluation型をまとめて取得（本文/人物slugなど）
  const evaluations = await getEvaluationsByIds(likedIds);//関数にいいね済みevaluationsIDのみ集めたIDリストを渡していいね済みEvaluation型を受け取る

  //いいねリストには載ってるけど、microCMSから返ってこなかったIDはどれという引き算をする
  const existingIdSet = new Set(evaluations.map((e) => e.id));//microCMSからとってきたevaluation型（いいね済み評価）からevaluationIDだけのチェックリスト（Set）を作る（一瞬で判定できるように）
  const missing = likedIds.filter((id) => !existingIdSet.has(id));//ユーザーがいいねしたevaluationID（likedIds）」を1つずつ見て、「チェックリスト（existingIdSet）」に載っていないものだけを抜き出す

// もし参照切れがあったら、DBからもその「いいね」を消しておく
if (missing.length > 0) {
  await prisma.like.deleteMany({
    where: {
      viewerId: viewer.id,
      evaluationId: { in: missing },
    },
  });
}


  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-4xl w-full px-8 py-20">
        <h1 className="text-3xl font-semibold">いいね一覧</h1>

        <RunAiReviewButton target={{ type: "likes" }} pathToRevalidate="/likes"
        label="いいねをレビュー実行"
        />

        {/* 参照切れ（デバッグ用。消してOK） */}
        {missing.length > 0 && (
          <div className="mt-6 bg-white rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-600 font-semibold">⚠️ 参照切れ</p>
            <p className="text-sm text-gray-600 mt-1">
              microCMS側に存在しない評価IDがDBに残っています:
            </p>
            <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
              {missing.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 space-y-4">
          {evaluations.map((e) => (
            <Link
              key={e.id}
              href={`/person/${e.personSlug}`}
              className="block bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition"
            >
              <p className="text-xs text-gray-500">
                {e.from} / {new Date(e.date).toLocaleDateString("ja-JP")}
              </p>
              <p className="mt-2 text-sm text-gray-800">
                {truncateToPlainText(e.contentHtml, 90)}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                → /person/{e.personSlug}
              </p>
            </Link>
          ))}
        </div>

        <Link className="inline-block mt-10 text-blue-600 underline" href="/">
          トップへ戻る
        </Link>
      </div>
    </main>
  );
}
