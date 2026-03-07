//ユーザーのアクション（AIレビュー生成ボタンをクリック）によってサイトがサーバーにリクエストし、サーバーがAIに頼んだものがJSONとして返ってきたもの（不安定なデータ）を検品及び型定義して、アプリで使える安全な形に変換するためのコード
import { z } from "zod";
import { PROMPT_VERSION, JSON_SCHEMA_VERSION } from "./versions";

export const ReviewV1Schema = z.object({
  promptVersion: z.literal(PROMPT_VERSION),
  schemaVersion: z.literal(JSON_SCHEMA_VERSION),
  target: z.object({
    type: z.enum(["top", "person", "likes", "favorites"]),
    key: z.string().nullable(),
  }),
  scores: z.object({
    ux: z.number().int().min(0).max(10),
    ui: z.number().int().min(0).max(10),
    performance: z.number().int().min(0).max(10),
    accessibility: z.number().int().min(0).max(10),
    codeQuality: z.number().int().min(0).max(10),
  }),
  summary: z.string(),
  goodPoints: z.array(z.string()),
  issues: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      title: z.string(),
      detail: z.string(),
      fix: z.string(),
    })
  ),
  nextActions: z.array(z.string()),
});

export type ReviewV1 = z.infer<typeof ReviewV1Schema>;