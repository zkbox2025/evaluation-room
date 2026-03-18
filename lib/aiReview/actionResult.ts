//サーバー側の処理（Action）からの結果の型定義。
export type RunAiReviewResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMIT"; waitSec: number; message: string }
  | { ok: false; code: "FORBIDDEN"; message: string }//viewerが取れない（cookie無効やviewer not found）場合
  | { ok: false; code: "VALIDATION_ERROR"; message: string }//AIからのレビュー結果が型定義（ReviewV1Schema）に当てはまらなかった場合
  | { ok: false; code: "UNKNOWN"; message: string };//それ以外は全て「UNKNOWN」