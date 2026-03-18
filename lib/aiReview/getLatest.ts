//個人ページの前回レビュー表示のために最新一件のレビューをとってくる関数
// src/lib/aiReview/getLatest.ts
import { prisma } from "@/infrastructure/prisma/client";
import type { ViewerId,ReviewTarget } from "@/domain/entities";

export async function getLatestAiReview(params: {
  viewerId: ViewerId;
  target: ReviewTarget;
}) {
  const { viewerId, target } = params;

  return prisma.aiReview.findFirst({
    where: {
      viewerId,
      targetType: target.type,
      targetKey: target.type === "person" ? target.key : null,
    },
    orderBy: { createdAt: "desc" },
  });
}