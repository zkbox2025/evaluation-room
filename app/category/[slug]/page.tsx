//カテゴリー別ページのファイル
import Link from "next/link";
import { getPeople } from "@/lib/getPerson";
import { getOrCreateViewer } from "@/lib/viewer";
import { prisma } from "@/infrastructure/prisma/client";
import { CategoryPeopleList } from "@/components/category/CategoryPeopleList"; //カテゴリー別一覧ページで使うページコンポーネント（検索、人物名・通称、お気に入りボタン）


type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  // 1. await で取得
  const { slug } = await params;
  
  // 2. URLエンコード（%E...）を日本語に戻す（カテゴリー別ページの末尾のURLが日本語のためエンコード状態のslugを元の日本語に戻す）
const categorySlug = (() => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
})();

  const people = await getPeople();//microcmsから人物一覧を取得

  // 3. これで '将棋' === '将棋' になり、フィルターが効くようになります
const persons = people
  .filter((p) => p.category?.slug === categorySlug)//peopleの中からcategorySlugと一致する人だけを残す
  .sort((a, b) => a.name.localeCompare(b.name, "ja")); //残った人たちをあいうえお順に並び替え

  // カテゴリ名（表示用）
  const categoryName = persons[0]?.category?.name ?? "カテゴリ";

  //  viewer
  const viewer = await getOrCreateViewer();//viewerIDを特定

  // このページに出る人だけ favorite 判定（最小）
  const personSlugs = persons.map((p) => p.slug);//カテゴリーに該当する人物からslugのみを抽出

  const favoriteRows = viewer
    ? await prisma.favorite.findMany({//DBからお気に入り済みのpersonslugを持ってくる。microcmsからのpersonSlugsと一致するものだけ持ってくる。
        where: { viewerId: viewer.id, personSlug: { in: personSlugs } },
        select: { personSlug: true },
      })
    : [];

      // ★ Setではそのまま渡せないのであえてSetは渡さずMapで配列にする
  const favoritedSlugs = favoriteRows.map((f) => f.personSlug);//シンプルな「スラッグの文字列リスト」に作り替える。

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-5xl w-full px-8 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">{categoryName}</h1>
          <Link href="/" className="text-sm text-blue-600 underline">
            トップへ戻る
          </Link>
        </div>

        {persons.length === 0 ? (
          <p className="mt-8 text-gray-600">このカテゴリには人物がいません。</p>
        ) : (
          <CategoryPeopleList
            persons={persons}
            favoritedSlugs={favoritedSlugs}
          />
        )}
      </div>
    </main>
  );
}

