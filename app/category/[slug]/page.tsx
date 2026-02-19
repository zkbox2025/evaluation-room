import Link from "next/link";
import { getPeople } from "@/lib/getPerson";
import { getOrCreateViewer } from "@/lib/viewer";
import { prisma } from "@/infrastructure/prisma/client";
import { CategoryPeopleList } from "@/components/category/CategoryPeopleList"; // ★追加


type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  // 1. await で取得
  const { slug } = await params;
  
  // 2. URLエンコード（%E...）を日本語に戻す ★ここが重要
  const categorySlug = decodeURIComponent(slug);

  const people = await getPeople();

  // 3. これで '将棋' === '将棋' になり、フィルターが効くようになります
const persons = people
  .filter((p) => p.category?.slug === categorySlug)
  .sort((a, b) => a.name.localeCompare(b.name, "ja")); // ★追加

  // カテゴリ名（表示用）
  const categoryName = persons[0]?.category?.name ?? "カテゴリ";

  //  viewer
  const viewer = await getOrCreateViewer();

  // このページに出る人だけ favorite 判定（最小）
  const personSlugs = persons.map((p) => p.slug);

  const favoriteRows = viewer
    ? await prisma.favorite.findMany({
        where: { viewerId: viewer.id, personSlug: { in: personSlugs } },
        select: { personSlug: true },
      })
    : [];

      // ★ Setは渡さず配列にする
  const favoritedSlugs = favoriteRows.map((f) => f.personSlug);

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

