import type { PersonSlug } from "@/domain/entities";

export type PersonCMS = {//microCMSから人物情報をPersonCMS として受け取る
  id: string;// microCMSのコンテンツID（内部用）
  slug: PersonSlug;
  name: string;
  category: string;// ←文字列
  description: string;
};

export type PersonRefCMS = {
  id: string;
  slug: string;
};

export type EvaluationCMS = {
  id: string;
  person: PersonRefCMS; // 被評価者への参照（IDとslug）
  from?: string;
  date: string;
  year?: number;
  type?: string;
  content?: string;
};
