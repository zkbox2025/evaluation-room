// app/likes/page.tsx
import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { getEvaluationsByIds } from "@/lib/getEvaluationsByIds";

function truncateText(html: string, max = 80) {
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default async function LikesPage() {
  // 1) viewer（端末）を特定
  const viewer = await getOrCreateViewer();

  if (!viewer) {
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">いいね一覧</h1>
        <p className="mt-4 text-gray-600">
          Cookieが無効の可能性があります。Cookieを有効にして再読み込みしてください。
        </p>
      </main>
    );
  }

  // 2) DBから、このviewerがいいねした evaluationId 一覧を取得
  const likes = await prisma.like.findMany({
    where: { viewerId: viewer.id },
    select: { evaluationId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const likedIds = likes.map((l) => l.evaluationId);

  // いいねが0件なら
  if (likedIds.length === 0) {
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">いいね一覧</h1>
        <p className="mt-4 text-gray-600">まだいいねがありません。</p>
        <Link className="inline-block mt-6 text-blue-600 underline" href="/">
          トップへ戻る
        </Link>
      </main>
    );
  }

  // 3) microCMSから評価をまとめて取得（本文/人物slugなど）
  const evaluations = await getEvaluationsByIds(likedIds);

  // もし microCMS 側から評価が消えた時（DBに残骸が残る）
  const existingIdSet = new Set(evaluations.map((e) => e.id));
  const missing = likedIds.filter((id) => !existingIdSet.has(id));

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-4xl w-full px-8 py-20">
        <h1 className="text-3xl font-semibold">いいね一覧</h1>

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
                {truncateText(e.contentHtml, 90)}
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
