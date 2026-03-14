import Link from "next/link";//ページの切り替えを早くするコンポーネント
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";//deviceIDを基にviewer（訪問者）を取得するか、なければ新しく作成する関数をインポートする
import { getPeople } from "@/lib/getPerson";////microCMSから人物一覧をとってきてPerson型に変換する関数（同じデータを何度も取りに行かないようにキャッシュする）をインポートする
import { RunAiReviewButton } from "@/components/ai/RunAiReviewButton";

export default async function FavoritesPage() {//ページ全体の関数
  // 1) viewer（端末）を特定
  const viewer = await getOrCreateViewer();//viewerIDを取得

  if (!viewer) {//クッキーが無効などでviewerIDが取得できない場合は、エラーメッセージで返す。
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">お気に入り</h1>
        <p className="mt-4 text-gray-600">
          Cookieが無効の可能性があります。Cookieを有効にして再読み込みしてください。
        </p>
      </main>
    );
  }

  // 2) DBから、このviewerがお気に入りした personSlug 一覧を取得
  const favorites = await prisma.favorite.findMany({//prismaのfavoriteテーブルから条件に合う行をfindmany(複数とる)する。
    where: { viewerId: viewer.id },//絞り込み条件（viewerIDで絞り込み）
    select: { personSlug: true, createdAt: true },//何を取るか
    orderBy: { createdAt: "desc" },//並び順（新しい順）
  });

  const favoritedSlugs = favorites.map((f) => f.personSlug);//お気に入り済みのpersonSlugだけの配列にする

  // お気に入りが0件なら
  if (favoritedSlugs.length === 0) {
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">お気に入り</h1>
        <RunAiReviewButton target={{ type: "favorites" }} pathToRevalidate="/favorites" />
        <p className="mt-4 text-gray-600">まだお気に入りがありません。</p>
        <Link className="inline-block mt-6 text-blue-600 underline" href="/">
          トップへ戻る
        </Link>
      </main>
    );
  }

  // 3) microCMSから人物一覧を取得して slug でPerson型を検索できる辞書を作る
  const people = await getPeople();//microCMSから人物一覧（PersonCMS）を取得してPerson型に変換し返す。
  const peopleBySlug = new Map(people.map((p) => [p.slug, p]));//Person型から「キー：slug,値：Person型」の配列にして（キーで特定できるようにする）辞書を作る。

  // 4) DBの順序（createdAt desc）に合わせて人物を並べ替え
  const favoritedPeople = favoritedSlugs
    .map((slug) => peopleBySlug.get(slug))//favoritedSlugs（DBの新しい順のslug配列）を一つ一つPerson（slug）に当てはめる
    .filter(Boolean);//undefined が取り除かれて [person, person, ...]にする

  // もし microCMS 側から人物が消えたりslugが変わった時（DBに残った残骸を集める）
  const missing = favoritedSlugs.filter((slug) => !peopleBySlug.has(slug));//DBにある slug が microCMS に存在しない＝参照切れにしてslug配列を作ってデバッグ表示に使う

  // もし参照切れがあったら、DBからもその「お気に入り」を消しておく
if (missing.length > 0) {
    await prisma.favorite.deleteMany({
      where: {
        viewerId: viewer.id,
        personSlug: { in: missing }, // 見つからなかったslugたちを一気に消す
      },
    });
  }

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-4xl w-full px-8 py-20">
        <h1 className="text-3xl font-semibold">お気に入り</h1>
          <RunAiReviewButton target={{ type: "favorites" }} pathToRevalidate="/favorites"
          label="AIレビューを実行"
          />


        {/* 参考：壊れ参照があれば表示（デバッグ用。消してOK） */}
        {missing.length > 0 && (
          <div className="mt-6 bg-white rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-600 font-semibold">⚠️ 参照切れ</p>
            <p className="text-sm text-gray-600 mt-1">
              microCMS側に存在しないslugがDBに残っています:
            </p>
            <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
              {missing.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-4">
          {favoritedPeople.map((p) => (
            <Link
              key={p!.slug}
              href={`/person/${p!.slug}`}
              className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
            >
              <p className="font-semibold">{p!.name}</p>
              <p className="mt-1 text-sm text-gray-500">{p!.category?.name}</p>
              <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                {p!.description}
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
