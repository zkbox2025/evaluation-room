//microCMSの categoryCMS（カテゴリー名とスラッグ）を domainでは Category { slug（カテゴリーのslug）, name（カテゴリーの名前） } に包んで扱うための関数を定義するファイル
import type { Category } from "@/domain/entities";
import { normalizeCategoryName, slugifyCategoryName } from "@/domain/rules";

type CategoryCMS =
  | string
  | { name?: string | null; slug?: string | null }
  | null
  | undefined;

export function toCategory(raw: CategoryCMS): Category {//CategoryCMSをCategory（slug,name）として返す関数
  // パターン(1) 文字列で届いたパターンなら、そのまま name にする（現在はこれのみ！！microCMSにカテゴリー名（文字列）しか入力してないから！）
  if (typeof raw === "string") {
    const name = normalizeCategoryName(raw);//categoryが文字列ならそのままnameにする
    return { name, slug: slugifyCategoryName(name) };//nameとnameで自動生成したURL用slug（簡易）で返す
  }

  // パターン(2) CategoryCMS型（slug/name）なら slug/name を優先して使う
  const name = normalizeCategoryName(raw?.name ?? "");//カテゴリー名があるならそのまま名前にして、なければ未分類とする
  const slug = (raw?.slug ?? "").trim();//slugがあったらそれを使い、なかったら代わりに""を使う

  // パターン(3) slug が取れてるならそれを採用。無いなら name から生成（nameとslugが違う場合はそれを優先させるため）
  return {
    name,
    slug: slug || slugifyCategoryName(name),
  };
}

//もしmicroCMS側で個別にスラッグ（tanaka等）を設定しているならそれが優先され、設定していなければ名前から自動で作られる