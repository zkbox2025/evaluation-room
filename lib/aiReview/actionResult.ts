//サーバー側の処理（Action）からの結果の型定義。
export type RunAiReviewResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMIT"; waitSec: number; message: string }
  | { ok: false; code: "ERROR"; message: string };