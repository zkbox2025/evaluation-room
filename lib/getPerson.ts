import { microcms } from "./microcms";//lib/microcms.tsからmicrosmsだけをここで使えるように持ってきて！
import { Person } from "@/types/person";//types/personからPersonだけをここで使えるように持ってきて！
import { unstable_cache } from "next/cache";//next/cacheからunstable_cacheだけをここで使えるように持ってきて！

type PeopleCMS = {　//PeopleCMS: microCMSから取得する人物データの型定義
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
};

export const getPeople = unstable_cache(//getPeople: 全員分の人物リストを取得する関数を公開
  async (): Promise<Person[]> => {//非同期であり、Person型の配列を返した後にキャッシュに保存されgetPeople() 関数を呼び出した側の変数 (peopleList など) に最終的な値として渡され
    const data = await microcms.getList<PeopleCMS>({//microcmsからPeopleCMS型のリストを取得
      endpoint: "people",//microCMSの"people"エンドポイントからデータを取得
      queries: { limit: 100 },//一度に最大100件まで取得
    });

    return data.contents.map((p) => ({//microCMSから取得したデータをPerson型に変換して返す
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
    }));
  },
  ["people:list"],//キャッシュを識別する名前
  { tags: ["people"] }//タグを使ってキャッシュをグループ化する（peopleタグがついたキャッシュを全部削除などができる）
);

export async function getPerson(slug: string): //getPerson(slug): 特定の人物の詳細情報を取得する関数を公開
Promise<Person | null> { //Person 型のデータか、または何も見つからなかった場合に null を返す
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
    ["people:bySlug", slug],//kokokara
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
