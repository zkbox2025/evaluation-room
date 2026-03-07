// src/lib/aiReview/actionResult.ts
export type RunAiReviewResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMIT"; waitSec: number; message: string }
  | { ok: false; code: "ERROR"; message: string };