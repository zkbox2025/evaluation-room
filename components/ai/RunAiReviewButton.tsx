"use client";

import { useEffect, useState, useTransition } from "react";
import { runAiReviewAction } from "@/app/actions/runAiReviewAction";
import type { ReviewTarget } from "@/lib/aiReview/types";

type Props = {
  target: ReviewTarget;
  pathToRevalidate: string;
  label?: string;
};

export function RunAiReviewButton({ target, pathToRevalidate, label = "AIレビューを実行" }: Props) {
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // ★ レート制限の残り秒数（nullなら制限なし）
  const [waitSec, setWaitSec] = useState<number | null>(null);

  // ★ カウントダウン（waitSecがある間だけ毎秒減らす）
  useEffect(() => {
    if (waitSec === null) return;

    const t = setInterval(() => {
      setWaitSec((s) => {
        if (s === null) return null;
        if (s <= 1) return null;
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [waitSec]);

  const onClick = () => {
    // ★ レート制限中は押せない
    if (waitSec !== null) return;
    if (isPending || locked) return;

    setLocked(true);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await runAiReviewAction(target, pathToRevalidate);

        if (!res?.ok) {
          // ✅ RATE_LIMIT の場合：待ち秒数を表示
          if (res.code === "RATE_LIMIT") {
            setWaitSec(res.waitSec);
            setMessage(null);
            return;
          }

          // その他エラー
          setMessage(`失敗しました：${res.message ?? "レビュー実行に失敗しました"}`);
          return;
        }

        setMessage("レビューを実行しました（保存/再描画）");
      } catch (e) {
        setMessage(`失敗しました：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLocked(false);
      }
    });
  };

  const disabled = isPending || locked || waitSec !== null;

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending || locked
          ? "レビュー実行中..."
          : waitSec !== null
          ? `待機中（${waitSec}秒）`
          : label}
      </button>

      {/* rate limit */}
      {waitSec !== null ? (
        <p className="text-xs text-red-600">
          レート制限中です。{waitSec}秒待ってから再実行してください。
        </p>
      ) : message ? (
        <p className="text-xs text-gray-600 whitespace-pre-wrap">{message}</p>
      ) : null}
    </div>
  );
}