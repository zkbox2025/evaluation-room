// src/components/ai/ReviewDiffForId.server.tsx
import { prisma } from "@/infrastructure/prisma/client";
import { diffReview } from "@/lib/aiReview/diff";
import { ReviewDiff } from "@/components/ai/ReviewDiff";

export async function ReviewDiffForId(props: { viewerId: string; reviewId: string }) {
  const { viewerId, reviewId } = props;

  // 1) まずこのレビューを取得（viewerガード）
  const current = await prisma.aiReview.findFirst({
    where: { id: reviewId, viewerId },
  });

  if (!current) return null;

  // 2) 同一ターゲットの success を新しい順に2件だけ取る
  //    ※「このidがerrorでも、ターゲットのsuccessが2件あれば差分は出せる」
  const successRows = await prisma.aiReview.findMany({
    where: {
      viewerId,
      targetType: current.targetType,
      targetKey: current.targetKey,
      status: "success",
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  const latest = successRows[0] ?? null;
  const prev = successRows[1] ?? null;

  // 3) success 0件
  if (!latest) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">まだレビューがありません。</p>
      </div>
    );
  }

  // 4) success 1件
  if (!prev) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          最新レビューはありますが、比較対象の前回レビューがまだありません。
        </p>
      </div>
    );
  }

  // 5) success 2件以上 → 差分表示（最新と1つ前）
  const diff = diffReview(latest.resultJson, prev.resultJson);

  return (
    <ReviewDiff
      scoreDeltas={diff.scoreDeltas}
      issuesDelta={diff.issuesDelta}
      latestIssues={diff.latestIssues}
      prevIssues={diff.prevIssues}
    />
  );
}