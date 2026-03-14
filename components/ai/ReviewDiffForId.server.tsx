//components/ai/ReviewDiffForId.server.tsx
//詳細レビュー画面の「前回レビューとの差分」表示のためのコンポーネント
//特定のレビューIDからその裏側で最新2回分の成功データをDBから探し出し、前回との違い（差分）を表示する
import { prisma } from "@/infrastructure/prisma/client";
import { diffReview } from "@/lib/aiReview/diff";//スコアの差分や課題数の差分を計算する関数
import { ReviewDiff } from "@/components/ai/ReviewDiff";//スコアの差分や課題数の差分を受け取って、UIに表示するコンポーネント


//「特定のレビューIDからその裏側で最新2回分の成功データをDBから探し出し、前回との違い（差分）を表示する」という一連の流れをまとめた「司令塔」のようなコンポーネント
export async function ReviewDiffForId(props: { viewerId: string; reviewId: string }) {//props（引数）はviewerId（訪問者ID）とreviewId（レビューID）を受け取る。
  const { viewerId, reviewId } = props;//propsからviewerId（訪問者ID）とreviewId（レビューID）を取り出す。

  // 1) まずこのレビューを１件取得（viewerガード）
  //「これは間違いなく、あなたが作成したレビューだね？」という本人確認のための処理。
  const current = await prisma.aiReview.findFirst({//まずはreviewIdとviewerIdが一致するレビューをデータベースから探す。これにより、他の人のレビューは見えないようにする（セキュリティ対策）。
    where: { id: reviewId, viewerId },//reviewIdとviewerIdが一致するレビューをデータベースから探す。
  });

  if (!current) return null;//もしレビューが見つからなければnullを返す。これによりこのコンポーネントを呼び出しているUIでは何も表示されなくなる。

  // 2) 同一ターゲットの success を新しい順に2件だけ取る
  //    ※「このidがerrorでも、ターゲットのsuccessが2件あれば差分は出せる」
  const successRows = await prisma.aiReview.findMany({//同一ターゲットの成功データを新しい順に2件だけ取る。これにより、たとえ現在のレビューが失敗（error）であっても、同じターゲットの成功データが2件あれば差分を出すことができる。
    where: {
      viewerId,//viewerIDが同じであること
      targetType: current.targetType,//ターゲットの種類が同じであること
      targetKey: current.targetKey,//ターゲットのキーが同じであること
      status: "success",//ステータスが成功（success）であること
    },
    orderBy: { createdAt: "desc" },//新しい順に並べる
    take: 2,//2件だけ取る
  });

  const latest = successRows[0] ?? null;//最新の成功データをlatestに入れる。もしsuccessRows[0]が存在しなければnullを入れる。
  const prev = successRows[1] ?? null;//1つ前の成功データをprevに入れる。もしsuccessRows[1]が存在しなければnullを入れる。

  // 3) success 0件
  if (!latest) {//もし成功データが1件もなければ、レビューがないことを表示するUIを返す。
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">まだレビューがありません。</p>
      </div>
    );
  }

  // 4) success 1件//もし成功データが1件しかなければ、比較対象の前回レビューがないことを表示するUIを返す。
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
  //successRowsの最新レビューと前回レビューのresultJsonをdiffReview関数に入れて、スコアの差分や課題数の差分を計算する。
  const diff = diffReview(latest.resultJson, prev.resultJson);

  //計算した差分をReviewDiffコンポーネントに渡して、UIに表示する。
  return (
    <ReviewDiff
      scoreDeltas={diff.scoreDeltas}
      issuesDelta={diff.issuesDelta}
      latestIssues={diff.latestIssues}
      prevIssues={diff.prevIssues}
    />
  );
}