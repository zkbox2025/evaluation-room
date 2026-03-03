"use client";

import { useTransition, useState } from "react";
import { usePathname } from "next/navigation";
import { saveDummyAiGeneration } from "@/app/actions/saveDummyAiGeneration";

export function SaveDummyAiButton({ personSlug }: { personSlug: string }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

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