import { microcms } from "./microcms";
import { Person } from "@/types/person";
import { unstable_cache } from "next/cache";

type PeopleCMS = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
};

export const getPeople = unstable_cache(　//getPeople: 全員分の人物リストを取得する関数
  async (): Promise<Person[]> => {
    const data = await microcms.getList<PeopleCMS>({
      endpoint: "people",
      queries: { limit: 100 },
    });

    return data.contents.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
    }));
  },
  ["people:list"],
  { tags: ["people"] }
);

// ★ここが重要：slugをキーにもタグにも入れる
export async function getPerson(slug: string): Promise<Person | null> { //getPerson(slug): 特定の人物の詳細情報を取得する関数
  return unstable_cache(
    async () => {
      const data = await microcms.getList<PeopleCMS>({
        endpoint: "people",
        queries: { filters: `slug[equals]${slug}`, limit: 1 },
      });

      const p = data.contents[0];
      if (!p) return null;

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        description: p.description,
      };
    },
    ["people:bySlug", slug],
    { tags: ["people", `people:${slug}`] }
  )();
}

export function groupPeopleByCategory(people: Person[]): Record<string, Person[]> {
  return people.reduce((acc, person) => { //groupPeopleByCategory: 取得したリストをカテゴリ別に分類するユーティリティ関数。
    const category = person.category || "その他";
    (acc[category] ??= []).push(person);
    return acc;
  }, {} as Record<string, Person[]>);
}
