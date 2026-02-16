//microCMSの category: "エンジニア"（文字列）を domainでは Category { slug, name } に包んで扱うための関数を定義するファイル
import type { Category } from "@/domain/entities";
import { normalizeCategoryName, slugifyCategoryName } from "@/domain/rules";

export function toCategory(raw: string | undefined | null): Category {
  const name = normalizeCategoryName(raw ?? "");
  return { name, slug: slugifyCategoryName(name) };
}
