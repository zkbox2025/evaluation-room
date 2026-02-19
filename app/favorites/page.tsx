import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { getPeople } from "@/lib/getPerson";

export default async function FavoritesPage() {
  // 1) viewer（端末）を特定
  const viewer = await getOrCreateViewer();

  if (!viewer) {
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
  const favorites = await prisma.favorite.findMany({
    where: { viewerId: viewer.id },
    select: { personSlug: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const favoritedSlugs = favorites.map((f) => f.personSlug);

  // お気に入りが0件なら
  if (favoritedSlugs.length === 0) {
    return (
      <main className="max-w-3xl mx-auto py-20 px-6">
        <h1 className="text-2xl font-bold">お気に入り</h1>
        <p className="mt-4 text-gray-600">まだお気に入りがありません。</p>
        <Link className="inline-block mt-6 text-blue-600 underline" href="/">
          トップへ戻る
        </Link>
      </main>
    );
  }

  // 3) microCMSから人物一覧を取得して slug で突合
  const people = await getPeople();
  const peopleBySlug = new Map(people.map((p) => [p.slug, p]));

  // 4) DBの順序（createdAt desc）に合わせて人物を並べ替え
  const favoritedPeople = favoritedSlugs
    .map((slug) => peopleBySlug.get(slug))
    .filter(Boolean);

  // もし microCMS 側から人物が消えたりslugが変わった時（DBに残骸が残るケース）
  const missing = favoritedSlugs.filter((slug) => !peopleBySlug.has(slug));

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-4xl w-full px-8 py-20">
        <h1 className="text-3xl font-semibold">お気に入り</h1>

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
