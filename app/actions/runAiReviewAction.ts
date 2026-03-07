"use server";

import { runAiReview } from "@/app/actions/aiReview";
import type { ReviewTarget } from "@/lib/aiReview/types";
import type { RunAiReviewResult } from "@/lib/aiReview/actionResult";

export async function runAiReviewAction(
  target: ReviewTarget,
  pathToRevalidate: string
): Promise<RunAiReviewResult> {
  // 返り値をそのまま UI に返す
  return await runAiReview(target, pathToRevalidate);
}