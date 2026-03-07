import { getLatestTwoReviews } from "@/lib/aiReview/getLatestTwo";
import { diffReview } from "@/lib/aiReview/diff";
import { ReviewDiff } from "@/components/ai/ReviewDiff";

export async function TargetReviewDiff(props: {
  viewerId: string;
  targetType: "top" | "person" | "likes" | "favorites";
  targetKey?: string | null;
}) {
  const { viewerId, targetType, targetKey = null } = props;

  const { latest, prev } = await getLatestTwoReviews({
    viewerId,
    targetType,
    targetKey,
    onlySuccess: true,
  });

  if (!latest) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">まだレビューがありません。</p>
      </div>
    );
  }

  if (!prev) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          最新レビューはありますが、比較対象の前回レビューがまだありません。
        </p>
      </div>
    );
  }

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