//カテゴリー別一覧ページで使うページコンポーネント（検索、人物名・通称、お気に入りボタン）
"use client";//ブラウザ側で動くコンポーネント

import Link from "next/link";
import { useMemo, useState } from "react";//useMemo（いつ誰が動くか（保存、停止、更新）を効率よく行うために指示する人）,useState(=画面を書き換える機能)
import { FavoriteButton } from "@/components/person/FavoriteButton";//お気に入りボタンの動きなどブラウザで動くコンポーネント関数

type Person = {//受け取る型を公開
  slug: string;
  name: string;
  description?: string | null;
};

export function CategoryPeopleList({//
  persons,
   favoritedSlugs,
}: {
  persons: Person[];
  favoritedSlugs: string[];
}) {
  //カテゴリー所属人物一覧から一瞬でお気に入り済みを判定するためにSetを作る
  const favoritedSet = useMemo(() => new Set(favoritedSlugs), [favoritedSlugs]);//useMemo（検索窓に入力してもお気に入りリスト（お気に入りした全員のリスト）は変わらないのでfavoritedSlugsが変わった時だけ作り直してねという役割）を使ってSetを作り爆速でお気に入り判定できるようにする（favoritedSlugとはお気に入り済みのみのpersonslugのリスト）
  const [q, setQ] = useState("");//検索窓に文字が入力されると画面の書き換えが行われる。（""＝初期値）（q＝query：検索文字）
  const filtered = useMemo(() => {//qが変わった(検索された)ので、useMemoの指示で新しい文字に合わせてカテゴリー所属人物一覧の表示を絞り込み直す
    const query = q.trim().toLowerCase();//検索文字を整える
    if (!query) return persons;//検索が空なら全表示（persons：カテゴリー所属人物）
    return persons.filter((p) => {//filter(条件に合うものだけを残す関数)
      const name = p.name.toLowerCase();//人物名が小文字でもOKにする（大文字と小文字の区別をなくす）
      const desc = (p.description ?? "").toLowerCase();//人物のdescriptionがundefinedやnullの場合、空文字にする（toLowerCaseをエラーにさせないため）
      return name.includes(query) || desc.includes(query);//名前もしくは通称に含まれる場合に表示の計算をし直す
    });
  }, [q, persons]);//useMemoはq（検索）もしくはpersons（カテゴリー所属人物）が変わった時だけ表示の計算し直すように指示を出す

  return (
    <>
      {/* ★カテゴリ内検索 */}
      <div className="mt-6">
      {/*onChange（：入力が変わったら呼ばれる）setQ(e.target.value)（：入力欄の文字をstateに保存）*/}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="このカテゴリ内で検索（名前・説明）"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2"
        />
        {/* 検索後の件数 */}
        <p className="mt-2 text-xs text-gray-500">
          {filtered.length} / {persons.length} 件
        </p>
      </div>
        {/* 検索結果が０なら表示する */}
      {filtered.length === 0 ? (
        <p className="mt-8 text-gray-600">検索条件に一致する人物がいません。</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* 表示の中身（map:一つずつ取り出して表示用部品に変換） */}
          {filtered.map((p) => (
            <div key={p.slug} className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/person/${p.slug}`}
                  className="font-semibold hover:underline"
                >
                  {p.name}
                </Link>
              {/* ここで一瞬でお気に入り済みを判定するためのSetにp.slugを入れて判定する */}.  
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
