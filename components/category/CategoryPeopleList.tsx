"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FavoriteButton } from "@/components/person/FavoriteButton";

type Person = {
  slug: string;
  name: string;
  description?: string | null;
};

export function CategoryPeopleList({
  persons,
   favoritedSlugs,
}: {
  persons: Person[];
  favoritedSlugs: string[];
}) {
  const favoritedSet = useMemo(() => new Set(favoritedSlugs), [favoritedSlugs]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return persons;
    return persons.filter((p) => {
      const name = p.name.toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }, [q, persons]);

  return (
    <>
      {/* ★カテゴリ内検索 */}
      <div className="mt-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="このカテゴリ内で検索（名前・説明）"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2"
        />
        <p className="mt-2 text-xs text-gray-500">
          {filtered.length} / {persons.length} 件
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-gray-600">検索条件に一致する人物がいません。</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.slug} className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/person/${p.slug}`}
                  className="font-semibold hover:underline"
                >
                  {p.name}
                </Link>

                <FavoriteButton
                  personSlug={p.slug}
                  initialIsFavorited={favoritedSet.has(p.slug)}
                />
              </div>

              <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
