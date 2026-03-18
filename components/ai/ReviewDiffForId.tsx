//components/ai/ReviewDiffForId.server.tsx
//特定のレビューIDから、その比較対象となる『カテゴリ』を特定して差分表示へ橋渡しするコンポーネント
import { prisma } from "@/infrastructure/prisma/client";
import { ReviewDiffForTarget } from "@/components/ai/ReviewDiffForTarget";
import type { ReviewTarget, PersonSlug } from "@/domain/entities";

export async function ReviewDiffForId(props: { viewerId: string; reviewId: string }) {//props（引数）はviewerId（訪問者ID）とreviewId（レビューID）を受け取る。
  const { viewerId, reviewId } = props;//propsからviewerId（訪問者ID）とreviewId（レビューID）を取り出す。

  // 1) まずこのレビューを１件取得（viewerガード）
  //「これは間違いなく、あなたが作成したレビューだね？」という本人確認のための処理。
  const current = await prisma.aiReview.findFirst({//まずはreviewIdとviewerIdが一致するレビューをデータベースから探す。これにより、他の人のレビューは見えないようにする（セキュリティ対策）。
    where: { id: reviewId, viewerId },//reviewIdとviewerIdが一致するレビューをデータベースから探す。
    select: {
      targetType: true,
      targetKey: true,
     },
    });

  if (!current) return null;//もしレビューが見つからなければnullを返す。これによりこのコンポーネントを呼び出しているUIでは何も表示されなくなる。

    const t = current.targetType;
  if (t !== "top" && t !== "person" && t !== "likes" && t !== "favorites") return null;

  // ✅ person は key が必須なので、無ければここで弾く
  if (t === "person" && !current.targetKey) return null;

  // ✅ ここに来たら target は必ず ReviewTarget になる
  const target: ReviewTarget =
    t === "person"
      ? { type: "person", key: current.targetKey as PersonSlug }
      : { type: t };

  return <ReviewDiffForTarget viewerId={viewerId} target={target} />;
}