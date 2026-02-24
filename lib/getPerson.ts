import { microcms } from "@/infrastructure/microcms/client";
import type { Person } from "@/domain/entities";
import { unstable_cache } from "next/cache";
import type { PersonCMS } from "@/infrastructure/microcms/types";
import { toDomainPerson } from "@/domain/mappers/person";


export const getPeople = unstable_cache(//microCMSから人物一覧をとってきてPerson型に変換する関数（同じデータを何度も取りに行かないようにキャッシュする）
  async (): Promise<Person[]> => {//最終的にPersonの配列で返す
    const data = await microcms.getList<PersonCMS>({
      endpoint: "people",
      queries: { limit: 100, depth: 2 },//depth:2とは、参照データを2階層まで展開する。たとえば people が category を参照している場合に、category の name や slug までちゃんと取れるようにする設定。（depthがないと、categoryが { id: "xxxx" } だけになって slug が取れないことがある）
    });

    return data.contents.map(toDomainPerson);
  },
  ["people:list"],
  { tags: ["people"] }
);

export async function getPerson(slug: string): Promise<Person | null> {//microCMSから特定の人物情報を持ってくる関数。キャッシュ機能（一度覚えたら忘れない）つき
  return unstable_cache(
    async () => {
      const data = await microcms.getList<PersonCMS>({
        endpoint: "people",
        queries: { filters: `slug[equals]${slug}`, limit: 1 },//渡したslugとピッタリ合うslugを持つ人を一人だけほしい
      });

      const p = data.contents[0];
      if (!p) return null;//誰も見つからなければnull(空っぽ)を返す
      return toDomainPerson(p);//
    },
    ["people:bySlug", slug],
    { tags: ["people", `people:${slug}`] }//peopleタグをつける
  )();
}

export function groupPeopleByCategory(people: Person[]): Record<string, Person[]> {//人物リストをカテゴリーごとにグループ分けする関数
  return people.reduce((acc, person) => {
    const categoryName = person.category?.name || "その他";//カテゴリー名を取得
    (acc[categoryName] ??= []).push(person);//もしカテゴリーの箱がまだなければ空の配列。箱の中に人物を入れる
    return acc;
  }, {} as Record<string, Person[]>);//カテゴリーの中にPerson型のデータをそれぞれ入れたものを返す
}
