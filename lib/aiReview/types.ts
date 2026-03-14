//AIレビュー機能で使用する型定義をまとめたファイル。ReviewTargetは、AIレビューの対象を指定するための型で、トップページ全体、特定の人物の評価、いいね一覧、またはお気に入り一覧などを表すことができます。
export type ReviewTarget = {
  type: "top" | "person" | "likes" | "favorites";
  key?: string | null; // person slug など
};