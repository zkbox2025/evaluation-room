// src/lib/aiReview/getLatestTwo.ts
import { prisma } from "@/infrastructure/prisma/client";

export async function getLatestTwoReviews(params: {
  viewerId: string;
  targetType: "top" | "person" | "likes" | "favorites";
  targetKey?: string | null;
  // 差分は success 同士で見たい場合は true 推奨
  onlySuccess?: boolean;
}) {
  const { viewerId, targetType, targetKey = null, onlySuccess = true } = params;

  const rows = await prisma.aiReview.findMany({
    where: {
      viewerId,
      targetType,
      targetKey,
      ...(onlySuccess ? { status: "success" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  return {
    latest: rows[0] ?? null,
    prev: rows[1] ?? null,
  };
}