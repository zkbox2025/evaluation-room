//お気に入りボタンのUIコンポーネント
"use client";//このファイルは ブラウザ（クライアント）で動く(サーバー側は app/actions/toggleFavorite.ts)

import { useState, useTransition } from "react";//useState(=画面を自動で書き換える)、useTransition（＝クリック等素早い反応を優先し、データ通信などの時間のかかる処理をバックグラウンド（裏側）で実行させる）
import { toggleFavorite } from "@/app/actions/toggleFavorite";
import { usePathname } from "next/navigation";

type Props = {//この関数に渡すデータの型
  personSlug: string;
  initialIsFavorited: boolean;//お気に入りの初期状態には「はい」か「いいえ」のどちらかしか入らない
};

export function FavoriteButton({ personSlug, initialIsFavorited }: Props) {//関数を公開
  const [isPending, startTransition] = useTransition();//サーバー通信中に「...」表示にしてボタンを押せないようにする
  const pathname = usePathname();//今のページをrevalidatePath(pathname) で更新できるようにする
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);//お気に入り状態を画面に反映する

  return (
    <button
      disabled={isPending}//isPending が true の間、ボタンを押せなくなる
      onClick={() => {
        setIsFavorited((v) => !v);//見た目を反転

        startTransition(async () => {
          await toggleFavorite(personSlug, pathname);//DBにお気に入り追加/削除されrevalidatePathが実行される
        });
      }}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isFavorited
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isPending ? "..." : isFavorited ? "★ お気に入り" : "☆ お気に入り"}
    </button>
  );
}
