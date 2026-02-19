//microCMSの category: "エンジニア"（文字列）を domainでは Category { slug, name } に包んで扱うための関数を定義するファイル
import type { Category } from "@/domain/entities";
import { normalizeCategoryName, slugifyCategoryName } from "@/domain/rules";

type CategoryCMS =
  | string
  | { name?: string | null; slug?: string | null }
  | null
  | undefined;

export function toCategory(raw: CategoryCMS): Category {
  // 1) 文字列ならそのまま name にする
  if (typeof raw === "string") {
    const name = normalizeCategoryName(raw);
    return { name, slug: slugifyCategoryName(name) };
  }

  // 2) オブジェクトなら slug/name を優先して使う
  const name = normalizeCategoryName(raw?.name ?? "");
  const slug = (raw?.slug ?? "").trim();

  // slug が取れてるならそれを採用。無いなら name から生成
  return {
    name,
    slug: slug || slugifyCategoryName(name),
  };
}
