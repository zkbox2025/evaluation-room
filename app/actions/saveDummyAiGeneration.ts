//フロントエンド（画面）とバックエンド（心臓部）を安全につなぐ『専用の窓口（橋渡し役）』」としての役割を持つサーバー側の処理（Action）。フロントエンドからpersonSlug（個人ページのスラッグ）とpathToRevalidate(再描画するパス)を受け取り、AI生成データをDBに保存する。そして、その結果をフロントエンドに返す。
"use server";

import { getOrCreateViewer } from "@/lib/viewer";
import { createAiGeneration } from "@/lib/aiGeneration";
import { revalidatePath } from "next/cache";

export async function saveDummyAiGeneration(personSlug: string, pathToRevalidate: string) {
  const viewer = await getOrCreateViewer();//deviceIDを基にviewer（訪問者）を特定するための関数を呼び出して、viewerオブジェクト（viewerID入り）を取得する。
  if (!viewer) return { ok: false, message: "viewer not found" };//viewerオブジェクトが取得できない場合（Cookieが無効などで訪問者を特定できない場合）は、エラーメッセージを返す。

  const row = await createAiGeneration({//AI生成データをDBに保存する関数を呼び出す。引数は以下の通り。
    viewerId: viewer.id,
    personSlug,
    prompt: "テスト入力: この人物の魅力をやさしく要約して",
    resultText: "",
    errorMessage: "テスト用エラー: rate limit simulated",
    model: "dummy-test-model",
    status: "error",
    tokensInput: 10,
    tokensOutput: 20,
    costUsdMicro: 123,
  });

  revalidatePath(pathToRevalidate);

  return { ok: true, id: row.id };
}