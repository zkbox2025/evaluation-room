//フロントエンド（画面）とバックエンド（心臓部）を安全につなぐ『専用の窓口（橋渡し役）』」としての役割を持つサーバー側の処理（Action）。フロントエンドからAIレビューの対象とpathToRevalidate(再描画するパス)を受け取り、AIレビュー機能の『司令塔（メイン処理）』を呼び出す。そして、その結果をフロントエンドに返す。
"use server";

import { runAiReview } from "@/app/actions/aiReview";////AIレビュー機能の『司令塔（メイン処理）』をインポートする。
import type { ReviewTarget } from "@/lib/aiReview/types";//AIレビューの対象（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）を指定するためのオブジェクト
import type { RunAiReviewResult } from "@/lib/aiReview/actionResult";//サーバー側の処理（Action）から返ってくる結果の型定義をインポートする。

export async function runAiReviewAction(
  target: ReviewTarget,//AIレビューの対象（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）とキー（personSlug（個人ページのみ））を指定するためのオブジェクト。
  pathToRevalidate: string
): Promise<RunAiReviewResult> {//サーバー側の処理（Action）から返す結果の型はRunAiReviewResult。AIレビューの結果が成功か失敗か、そして失敗ならエラーコードやメッセージを含む。
  return await runAiReview(target, pathToRevalidate); // 返り値をそのまま UI（ボタン）など呼び出しもとに返す
}