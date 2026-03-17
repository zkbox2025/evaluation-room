//特定の対象（人物やページなど）の最新2件のレビューを比較し、その差分を画面に表示するためのコンポーネント

import { getLatestTwoReviews } from "@/lib/aiReview/getLatestTwo";
import { diffReview } from "@/lib/aiReview/diff";
import { ReviewDiff } from "@/components/ai/ReviewDiff";

export async function ReviewDiffForTarget(props: {
//引数は以下の通り
  viewerId: string;
  targetType: "top" | "person" | "likes" | "favorites";
  targetKey?: string | null;
}) {
  const { viewerId, targetType, targetKey = null } = props;//引数から以上を抜き出す（targetKeyのデフォルトはnull：人物のみslugをつけてと親からの指定があるから）

  const { latest, prev } = await getLatestTwoReviews({//最新レビュー（成功のみ）を2件取ってくる関数を呼び出して取ってくる。
    //以下、引数
    viewerId,
    targetType,
    targetKey,
    onlySuccess: true,
  });

  if (!latest) {//もし最新レビューがない場合は、以下を返す
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">まだレビューがありません。</p>
      </div>
    );
  }

  if (!prev) {//もし前回レビューがない場合は、以下を返す
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          最新レビューはありますが、比較対象の前回レビューがまだありません。
        </p>
      </div>
    );
  }

  const diff = diffReview(latest.resultJson, prev.resultJson);//差分計算関数（scores増減＋issues件数差)(resultJson（レビューの結果）から取り出す)を呼び出す

  return (//差分表示コンポーネントに渡す
    <ReviewDiff
      scoreDeltas={diff.scoreDeltas}
      issuesDelta={diff.issuesDelta}
      latestIssues={diff.latestIssues}
      prevIssues={diff.prevIssues}
    />
  );
}