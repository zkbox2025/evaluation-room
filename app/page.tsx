// app/page.tsx
import Link from "next/link";
import { getPeople, groupPeopleByCategory } from "@/lib/getPerson";
import { getLatestEvaluations } from "@/lib/getLatestEvaluations";
import { getOrCreateViewer } from "@/lib/viewer";
import { prisma } from "@/infrastructure/prisma/client";
import { FavoriteButton } from "@/components/person/FavoriteButton";
import { getEvaluationsByIds } from "@/lib/getEvaluationsByIds"; 
import { LikeButton } from "@/components/evaluation/LikeButton";


function truncateText(html: string, max = 80) {
  const text = html.replace(/<[^>]+>/g, "").trim(); // 超簡易でOK
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default async function Home() {
  // 1) microCMS
  const people = await getPeople();
  const grouped = groupPeopleByCategory(people);
  const latest = await getLatestEvaluations(5);

    // 2) viewer（DBの人）
  const viewer = await getOrCreateViewer();

  const latestIds = latest.map((e) => e.id);

const latestLikeRows = viewer
  ? await prisma.like.findMany({
      where: { viewerId: viewer.id, evaluationId: { in: latestIds } },
      select: { evaluationId: true },
    })
  : [];

const latestLikedSet = new Set(latestLikeRows.map((l) => l.evaluationId));


  // 3) favorites（サイドバーで使う10件）
  const favoriteRows = viewer
    ? await prisma.favorite.findMany({
        where: { viewerId: viewer.id },
        select: { personSlug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  // トップ人物カード（カテゴリ一覧）で「★状態」を判定するためSet化（全件でもOK）
  const favoritedSlugs = new Set(favoriteRows.map((f) => f.personSlug));

  // slug → person を引く辞書（名前表示用）
  const peopleBySlug = new Map(people.map((p) => [p.slug, p]));

  // 4) likes（最近10件 → うち5件表示）
  const likeRows = viewer
    ? await prisma.like.findMany({
        where: { viewerId: viewer.id },
        select: { evaluationId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  const likedIds = likeRows.map((l) => l.evaluationId);
  const likedEvaluations = await getEvaluationsByIds(likedIds); // microCMSから本文等を引く
  const recentLiked = likedEvaluations.slice(0, 5);


  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-6xl w-full px-8 py-20">
        <h1 className="text-4xl font-semibold text-center">評価の部屋</h1>

        <p className="mt-4 text-center text-sm text-gray-500">
          people: {people.length} / latest: {latest.length}
        </p>

        {/* ★ ここがサイドメニュー化の本体 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">
          {/* ========= 左：サイドメニュー ========= */}
          <aside className="space-y-8">
            {/* いいね */}
            <section className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">いいね</h2>
                <Link href="/likes" className="text-xs text-blue-600 underline">
                  一覧へ
                </Link>
              </div>

              {recentLiked.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">まだいいねがありません</p>
              ) : (
                <div className="mt-3 max-h-72 overflow-y-auto">
                <ul className="space-y-3">
                  {recentLiked.map((e) => (
                    <li key={e.id} className="text-sm">
                      <Link
                        href={`/person/${e.personSlug}`}
                        className="block hover:underline"
                      >
                        <div className="text-xs text-gray-500">
                          {e.from} / {new Date(e.date).toLocaleDateString("ja-JP")}
                        </div>
                        <div className="text-gray-800">
                          {truncateText(e.contentHtml, 60)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
              )}
            </section>
            {/* お気に入り */}
            <section className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">お気に入り</h2>
                <Link href="/favorites" className="text-xs text-blue-600 underline">
                  すべて見る
                </Link>
              </div>

              {favoriteRows.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">
                  まだお気に入りがありません
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {favoriteRows.map((f) => {
                    const p = peopleBySlug.get(f.personSlug);
                    return (
                      <li key={f.personSlug}>
                        <Link
                          href={`/person/${f.personSlug}`}
                          className="text-sm text-gray-800 hover:underline"
                        >
                          {p?.name ?? f.personSlug}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

          
          </aside>
          {/* ========= 右：メイン ========= */}
          <main>
            {/* ① 最新評価 */}
            <section>
              <h2 className="text-xl font-semibold mb-6">最新の評価</h2>

              <div className="space-y-6">
                {latest.map((e) => (
  <div key={e.id} className="bg-white p-6 rounded-xl shadow-sm">
    <div
      className="prose prose-neutral max-w-none ..."
      dangerouslySetInnerHTML={{ __html: e.contentHtml }}
    />
    <div className="mt-4 flex items-center justify-between">
      <LikeButton evaluationId={e.id} initialIsLiked={latestLikedSet.has(e.id)} />
      <Link href={`/person/${e.personSlug}`} className="text-xs text-gray-500 hover:underline">
        /person/{e.personSlug}
      </Link>
    </div>
  </div>
))}

              </div>
            </section>

           {/* ② ジャンル別人物 */}
<section className="mt-20 space-y-12">
  {Object.entries(grouped).map(([categoryName, persons]) => {
    // ★ここが本当に slug になってるかが命
    const categorySlug = persons[0]?.category?.slug ?? "uncategorized";

      // ★ 追加：name昇順に並び替え（元配列を壊さないようにコピーしてsort）
  const sortedPersons = [...persons].sort((a, b) =>
    a.name.localeCompare(b.name, "ja")
  );

    return (
      <div key={categoryName}>
        <Link
          href={`/category/${categorySlug}`}
          className="text-xl font-semibold mb-4 inline-block hover:underline"
        >
          {categoryName}
        </Link>

        <div className="grid grid-cols-2 gap-4">
          {sortedPersons.map((p) => (
            <div key={p.slug} className="bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/person/${p.slug}`} className="font-semibold">
                  {p.name}
                </Link>

                <FavoriteButton
                  personSlug={p.slug}
                  initialIsFavorited={favoritedSlugs.has(p.slug)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  })}
</section>


          </main>

        
        </div>
      </div>
    </main>
  );
}
