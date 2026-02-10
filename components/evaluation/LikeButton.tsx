"use client";//ブラウザだけで動く特別な関数であることを示す特殊な指示

import { useTransition } from "react";//Reactの状態管理フックの一つで、非同期処理中の状態を管理するために使う
import { toggleLike } from "@/app/actions/toggleLike";//評価にいいねをつけたり外したりする非同期関数をインポートする
import { usePathname } from "next/navigation";//現在のページのパスを取得するための関数をインポートする

type Props = {//コンポーネント（UIの部品）のプロパティ（色や形の指示書）の型を定義する
  evaluationId: string;
  initialIsLiked: boolean; // 最初からいいねしてるか
};

export function LikeButton({ evaluationId, initialIsLiked }: Props) {//いいねボタンのコンポーネントおよびプロパティに関する関数
  const [isPending, startTransition] = useTransition();//非同期処理中の状態を管理するためのフックを呼び出す
  const pathname = usePathname();//現在のページのパスを取得する関数を呼び出す

  return (//いいねボタンの見た目と動きを定義する
    <button
      disabled={isPending}//非同期処理中はボタンを押せないようにする
      onClick={() => {//クリックされた時の動きを定義する
        startTransition(() => toggleLike(evaluationId, pathname)); //評価にいいねをつけたり外したりする非同期関数を呼び出す
      }}
      className={`mt-4 px-3 py-1 rounded-full text-xs font-medium transition-colors ${// ボタンのスタイルを定義する
        initialIsLiked 
          ? "bg-pink-100 text-pink-600" // いいね済みの色
          : "bg-gray-100 text-gray-500 hover:bg-gray-200" // 未いいねの色
      }`}
    >
      {isPending ? "..." : initialIsLiked ? "♥ いいね済み" : "♡ いいね"}   
    </button>
  );
}
