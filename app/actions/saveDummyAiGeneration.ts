"use server";

import { getOrCreateViewer } from "@/lib/viewer";
import { createAiGeneration } from "@/lib/aiGeneration";
import { revalidatePath } from "next/cache";

export async function saveDummyAiGeneration(personSlug: string, pathToRevalidate: string) {
  const viewer = await getOrCreateViewer();
  if (!viewer) return { ok: false, message: "viewer not found" };

  const row = await createAiGeneration({
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