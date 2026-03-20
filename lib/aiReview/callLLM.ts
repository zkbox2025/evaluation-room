//AIに注文書を送りレビュー結果を受け取るための「窓口（関数）」
// lib/aiReview/callLLM.ts
import OpenAI from "openai";
import { ReviewV1Schema, type ReviewV1 } from "./reviewSchema";


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });//env.やVercelの環境変数として設定したOPENAI_API_KEYを使ってOpenAIにアクセスするための専用電話機を作成

const REVIEW_JSON_SCHEMA = {//AIに返してほしい型をJSON schema形式で定義する
  type: "json_schema",
  name: "ai_review_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "promptVersion",
      "schemaVersion",
      "target",
      "scores",
      "summary",
      "goodPoints",
      "issues",
      "nextActions",
    ],
    properties: {
      promptVersion: { type: "string" },
      schemaVersion: { type: "string" },
      target: {
        type: "object",
        additionalProperties: false,
        required: ["type", "key"],
        properties: {
          type: { enum: ["top", "person", "likes", "favorites"] },
          key: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
      scores: {
        type: "object",
        additionalProperties: false,
        required: ["ux", "ui", "performance", "accessibility", "codeQuality"],
        properties: {
          ux: { type: "integer", minimum: 0, maximum: 10 },
          ui: { type: "integer", minimum: 0, maximum: 10 },
          performance: { type: "integer", minimum: 0, maximum: 10 },
          accessibility: { type: "integer", minimum: 0, maximum: 10 },
          codeQuality: { type: "integer", minimum: 0, maximum: 10 },
        },
      },
      summary: { type: "string" },
      goodPoints: { type: "array", items: { type: "string" } },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["severity", "title", "detail", "fix"],
          properties: {
            severity: { enum: ["high", "medium", "low"] },
            title: { type: "string" },
            detail: { type: "string" },
            fix: { type: "string" },
          },
        },
      },
      nextActions: { type: "array", items: { type: "string" } },
    },
  },
} as const;//このオブジェクトを固定値として扱う

export async function callLLMReview(args: {
  //以下引数とする
  system: string;
  user: string;
  model: string;
}): Promise<{//返り値はAPI呼び出しが終わるまで待ってから返す
  result: ReviewV1;
  tokensInput?: number;
  tokensOutput?: number;
  costUsdMicro?: number;
}> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");//APIキーがなければ失敗させる

console.log("[env]", process.env.VERCEL_ENV, process.env.NODE_ENV);
console.log("[key]", (process.env.OPENAI_API_KEY ?? "").slice(0, 7), "...", (process.env.OPENAI_API_KEY ?? "").slice(-4));

  const resp = await client.responses.create({//OpenAIに以下を送信し、返事が来たら次の行に進む
    model: args.model,
    input: [
      { role: "system", content: [{ type: "input_text", text: args.system }] },//systemの内容
      { role: "user", content: [{ type: "input_text", text: args.user }] },//userの内容
    ],
    text: { format: REVIEW_JSON_SCHEMA },//返事はこのJSON Schemaに従うこと
  });


  const text = resp.output_text;//OPENAIからの返事の全文を文字列としての出力を取り出す。
  if (!text) throw new Error("Empty response");//なければエラーを出す

  const json = JSON.parse(text);//文字列をJavascriptに変換
  const parsed = ReviewV1Schema.parse(json);//アプリ側でも検品（二重チェック）


  return {//以下を返す
    result: parsed,
    tokensInput: resp.usage?.input_tokens,
    tokensOutput: resp.usage?.output_tokens,
  };
}