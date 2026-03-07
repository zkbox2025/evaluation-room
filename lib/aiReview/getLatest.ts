// src/lib/aiReview/getLatest.ts
import { prisma } from "@/infrastructure/prisma/client";

export async function getLatestAiReview(params: {
  viewerId: string;
  targetType: "top" | "person" | "likes" | "favorites";
  targetKey?: string | null;
}) {
  const { viewerId, targetType, targetKey = null } = params;

  return prisma.aiReview.findFirst({
    where: {
      viewerId,
      targetType,
      targetKey,
    },
    orderBy: { createdAt: "desc" },
  });
}