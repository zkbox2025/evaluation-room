//「特定のユーザーの最新2回分のAIレビューをDBから取ってきて、その変化（差分）を計算し、画面に表示するという一連の流れをまとめた「司令塔」のようなコンポーネント
import { getLatestTwoReviews } from "@/lib/aiReview/getLatestTwo";
import { diffReview } from "@/lib/aiReview/diff";
import { ReviewDiff } from "@/components/ai/ReviewDiff";

export async function TargetReviewDiff(props: {
  //props（引数）は以下の通り
  viewerId: string;
  targetType: "top" | "person" | "likes" | "favorites";
  targetKey?: string | null;
}) {
  //propsからviewerId（訪問者ID）とtargetType（対象の種類）とtargetKey（対象のキー）を取り出す。targetKey = nullはデフォルト値で、person以外の対象にはキーがないためnullになる。
  const { viewerId, targetType, targetKey = null } = props;

  const { latest, prev } = await getLatestTwoReviews({//viewerIdを使って、その人の最新2回分のAIレビューをDBから取ってくる関数を呼び出して、latest（最新レビュー）とprev（前回レビュー）を受け取る。
    //以下引数とする。
    viewerId,
    targetType,
    targetKey,
    onlySuccess: true,
  });

  if (!latest) {//もし最新レビューがなければ、レビューがないことを表示するUIを返す。
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">まだレビューがありません。</p>
      </div>
    );
  }

  if (!prev) {//もし前回レビューがなければ、比較対象の前回レビューがないことを表示するUIを返す。
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          最新レビューはありますが、比較対象の前回レビューがまだありません。
        </p>
      </div>
    );
  }

  const diff = diffReview(latest.resultJson, prev.resultJson);//getLatestTwoReviewsで取ってきた最新レビューと前回レビューのresultJsonをdiffReview関数に入れて、スコアの差分や課題数の差分を計算する。

  return (
    <ReviewDiff
      scoreDeltas={diff.scoreDeltas}
      issuesDelta={diff.issuesDelta}
      latestIssues={diff.latestIssues}
      prevIssues={diff.prevIssues}
    />
  );
}