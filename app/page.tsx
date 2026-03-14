// app/page.tsx
import Link from "next/link";
import { getPeople, groupPeopleByCategory } from "@/lib/getPerson";
import { getLatestEvaluations } from "@/lib/getLatestEvaluations";
import { getOrCreateViewer } from "@/lib/viewer";
import { prisma } from "@/infrastructure/prisma/client";
import { FavoriteButton } from "@/components/person/FavoriteButton";
import { getEvaluationsByIds } from "@/lib/getEvaluationsByIds"; 
import { LikeButton } from "@/components/evaluation/LikeButton";
import { truncateToPlainText } from "@/viewmodels/formatters";
import { clipHtml } from "@/viewmodels/formatters";
import { RunAiReviewButton } from "@/components/ai/RunAiReviewButton";//
import { TargetReviewDiff } from "@/components/ai/TargetReviewDiff.server";


export default async function Home() {//ページ本体の関数
  // 1) microCMS
  const people = await getPeople();//人物一覧を取得
  const grouped = groupPeopleByCategory(people);//人物リストをカテゴリーごとにグループ分けする関数にpeople型を入れて整理
  const latest = await getLatestEvaluations(5);//miceroCMSから最新evaluation型５件を取得する

    // 2) viewer（DBの人）
  const viewer = await getOrCreateViewer();//deviceIDからviewerIDを取得
  {/* Topレビュー実行 */}
  <RunAiReviewButton target={{ type: "top" }} pathToRevalidate="/" />

  const latestIds = latest.map((e) => e.id);//最新evaluation型（５件）の中からevaluationIDのみを取得

  //最新評価５件のいいねボタンを赤く塗るかどうかの判定をする
  const latestLikeRows = viewer
  ? await prisma.like.findMany({//viewerIDを使って最新evaluationID５件の中にいいね済み評価があった場合にそのevaluationIDを取得
      where: { viewerId: viewer.id, evaluationId: { in: latestIds } },
      select: { evaluationId: true },
    })
  : [];//Viewerがいなければ空

  //検索スピードを爆速にするための準備
   // トップ最新評価５件で「★状態」を判定するためSet化
const latestLikedSet = new Set(latestLikeRows.map((l) => l.evaluationId));//最新評価５件の中でViewerがいいねしている評価のevaluationIDだけのチェックリスト（Set）を作る（一瞬で判定するため）


  // 3) favorites（サイドバーで使う最新お気に入り10件をDBからとってくる）
  const favoriteRows = viewer
    ? await prisma.favorite.findMany({
        where: { viewerId: viewer.id },
        select: { personSlug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  //favorites（カテゴリー一覧で使うお気に入りをDBからとってくる）
    const allFavoriteSlugsRows = viewer
  ? await prisma.favorite.findMany({
      where: { viewerId: viewer.id },
      select: { personSlug: true }, // slugだけで軽い
    })
  : [];

  //検索スピードを爆速にするための準備
  // トップ人物カード（カテゴリ一覧）で「★状態」を判定するためSet化
  const favoritedSlugs = new Set(allFavoriteSlugsRows.map((f) => f.personSlug));//viewerがお気に入りにしている人物のpersonSlugだけのチェックリスト（Set）を作る（一瞬で判定するため）

  // slug → person を引く辞書（サイドバー名前表示用）
  const peopleBySlug = new Map(people.map((p) => [p.slug, p]));

  // 4) likes（サイドバーで使ういいね評価をDBからとってくる。最近10件 → うち5件表示）
  const likeRows = viewer
    ? await prisma.like.findMany({
        where: { viewerId: viewer.id },
        select: { evaluationId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  const likedIds = likeRows.map((l) => l.evaluationId);//最新いいねデータからevaluationIDを抽出
  const likedEvaluations = await getEvaluationsByIds(likedIds); //microCMSから最新いいね評価のデータを持ってくる（最新いいね評価１０件のevaluationIDを基に）
  const recentLiked = likedEvaluations.slice(0, 5);//５件表示(サイドバーに)


  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-6xl w-full px-8 py-20">
       <div className="flex items-start justify-between">
  {/* 左のダミー（右側のボタン幅とだいたい同じ役割） */}
  <div className="w-[160px]" />

  <h1 className="text-4xl font-semibold text-center flex-1">評価の部屋</h1>

  <div className="w-[160px] flex flex-col items-end gap-3">
    <RunAiReviewButton target={{ type: "top" }} pathToRevalidate="/" />
    <Link
      href="/reviews"
      className="text-sm rounded-lg px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50"
    >
      レビュー履歴
    </Link>
  </div>
</div>

        <p className="mt-1 text-center text-sm text-gray-500">
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
                          {truncateToPlainText(e.contentHtml, 60)}
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
                  {favoriteRows.map((f) => {{/* データを取り出してHTMLに変身させて新しいリストを作る */}
                    const p = peopleBySlug.get(f.personSlug);{/* スラッグから名前を検索 */}
                    return (
                      <li key={f.personSlug}>
                        {p ? (
                       <Link href={`/person/${f.personSlug}`} className="text-sm text-gray-800 hover:underline">
                       {p.name}
                       </Link>
                       ) : (
                      <span className="text-sm text-gray-500">不明</span>
                      )}
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
      dangerouslySetInnerHTML={{ __html: clipHtml(e.contentHtml, 200) }}
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
   {/* microCMSのカテゴリーに登録されてるものを表示 */}
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
