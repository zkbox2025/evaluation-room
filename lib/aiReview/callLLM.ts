//AIに注文書を送りレビュー結果を受け取るための「窓口（関数）」
import type { ReviewV1 } from "./reviewSchema";

// TODO: あなたのOpenAI呼び出し実装に置き換える
export async function callLLMReview(args: {
  system: string;
  user: string;
  model: string;
}): Promise<{
  result: ReviewV1;          // 構造化JSON
  tokensInput?: number;
  tokensOutput?: number;
  costUsdMicro?: number;
}> {
  // ここは仮：実際は OpenAI / 他LLM を呼ぶ
  throw new Error("callLLMReview is not implemented yet");
}