//lib/aiReview/getLatestTwo.ts
//特定のユーザーの最新2回分のAIレビューをDBから取ってくる関数
import { prisma } from "@/infrastructure/prisma/client";

export async function getLatestTwoReviews(params: {//viewerId（訪問者ID）とtargetType（対象の種類）とtargetKey（対象のキー）を指定して、その条件に合う最新2回分のAIレビューをデータベースから取得する。そして、最新のレビューとその前のレビューをオブジェクトとして返す。
  //引数は以下の通り（params:Parametersの略で引数はバラバラのデータ）
  viewerId: string;
  targetType: "top" | "person" | "likes" | "favorites";
  targetKey?: string | null;//personページのレビューを取るときはpersonのslugが入る。それ以外はnullでいい。
  // 差分は success 同士で見たい場合は true 
  onlySuccess?: boolean;//AIレビューの結果が成功のものだけを対象にするかどうか。デフォルトはtrue（成功のものだけ）。falseにすると失敗のレビューも含めて最新2回分を取ってくる。
}) {
  //paramsからviewerId（訪問者ID）とtargetType（対象の種類）とtargetKey（対象のキー）とonlySuccess（成功のものだけを取るかどうか）を取り出す。デフォルトは以下の通り。
  const { viewerId, targetType, targetKey = null, onlySuccess = true } = params;

  const rows = await prisma.aiReview.findMany({//データベースからaiReviewテーブルを検索して、createdAt（作成日時）が新しい順に並べたものから、最新2件分のレビューを取ってくる。
    where: {//検索条件は以下の通り。
      viewerId,//同じviewerId（訪問者ID）
      targetType,//同じtargetType（対象の種類）
      targetKey,//同じtargetKey（対象のキー）(personslugがあれば)
      ...(onlySuccess ? { status: "success" } : {}),//もしonlySuccessがtrueなら、さらにstatusがsuccessのものだけに絞り込む。falseなら絞り込みなし（失敗のレビューも含める）今はtrueなのでsuccessのものだけに絞り込む。
    },
    orderBy: { createdAt: "desc" },//createdAt（作成日時）が新しい順に並べる
    take: 2,//最新2件分を取ってくる
  });

  return {
    latest: rows[0] ?? null,//最新のレビューはrowsの0番目に入る。もしrows[0]が存在しない（レビューが1件もない）ならnullを返す。
    prev: rows[1] ?? null,//前のレビューはrowsの1番目に入る。もしrows[1]が存在しない（レビューが1件しかない）ならnullを返す。
  };
}