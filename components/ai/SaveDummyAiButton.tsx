//AIとの会話データをダミーで保存するためのフロントエンドコンポーネント。テスト用。実際のAI生成処理は行わず、固定のプロンプトでDBに保存するだけ。保存結果を画面に表示する。
"use client";

import { useTransition, useState } from "react";
import { usePathname } from "next/navigation";
import { saveDummyAiGeneration } from "@/app/actions/saveDummyAiGeneration";


export function SaveDummyAiButton({ personSlug }: { personSlug: string }) {//このコンポーネントが受け取るprops(引数)の型定義。personSlugは個人ページのスラッグを指定する文字列。
  const pathname = usePathname();//現在のページのパスを取得するためのフック。AIとの会話データを保存した後にこのパスを再描画（再検証）するために使う。
  const [isPending, startTransition] = useTransition();//データベースへの保存など、少し時間がかかる処理を「裏側でやってね」と指示する仕組み。isPending: 「今、裏で作業中（保存中）だよ」という状態を教えてくれる。
  const [message, setMessage] = useState<string>("");//メッセージの書き換え準備

  return (
    <div className="mt-4">
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const res = await saveDummyAiGeneration(personSlug, pathname);
            setMessage(res.ok ? `保存OK: ${res.id}` : `失敗: ${res.message}`);
          });
        }}
        className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
      >
        {isPending ? "保存中..." : "AI生成履歴をダミー保存（テスト）"}
      </button>

      {message && <p className="mt-2 text-xs text-gray-500">{message}</p>}
    </div>
  );
}