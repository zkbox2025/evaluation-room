//# ドメインの概念（User, Person, Review…）
import type { EvaluationKind } from "./rules";

export type ViewerId = string;
export type EvaluationContentId = string;
export type PersonSlug = string;

export type Viewer = {
  id: ViewerId;
  deviceId: string;
  createdAt: Date;

};

//カテゴリーのname,slugと人物のname,slugがある
export type Category = {
  slug: string;  //カテゴリー一覧ページ(URL)用のslug（人物slugとは異なる）
  name: string;   // カテゴリーの名前
};

export type Person = {
  cmsId: string;   // microCMSのコンテンツID（内部用）
  slug: PersonSlug;// 個別URL/参照用(カテゴリー用とは異なる)
  name: string;
  description: string;
  category: Category; // 型として切り出し、personに含める
};


// 評価カード（microCMSのEvaluation）
export type Evaluation = {
  id: EvaluationContentId;// microCMSのEvaluationIDを保存する（なおDB内にEvaluationテーブルは存在しない（外部参照））
  personSlug: PersonSlug;  // 被評価者
  from: string;            // 評価者名（PersonにしないならstringでOK）
  date: string;            // ISO文字列でもOK。後でDateに寄せてもOK
  year: number;
  kind: EvaluationKind;           
  contentHtml: string;
  isLiked?: boolean; // ★ これを追加（任意項目にする）
};
