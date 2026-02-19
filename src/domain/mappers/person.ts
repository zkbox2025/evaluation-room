import type { Person, PersonSlug } from "@/domain/entities";
import type { PersonCMS } from "@/infrastructure/microcms/types";
import { toCategory } from "@/domain/mappers/category";

export function toDomainPerson(p: PersonCMS): Person {//microCMSなどの外部ソースから取得した生のデータ（PersonCMS）を、自分のアプリが定義したルール（Person）に沿った形に整形(カテゴリーを専用の型に変換)
  return {
    cmsId: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: toCategory(p.category),
  };
}

export function createUnknownPerson(slug: PersonSlug): Person {//もし指定された人物が見つからなかった場合などに、アプリが壊れないように「不明な人」というダミーデータを作るための関数
  return {
    cmsId: "unknown",
    slug,
    name: "不明",
    description: "",
    category: toCategory(undefined),
  };
}