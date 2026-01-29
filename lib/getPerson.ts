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
      id: p.id,//キャッシュに保存されるデータの中身は以下の通り
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
    }));
  },
  ["people:list"],//microCMSのデータを関数を通して取得した全員分の人物リスト（データ）を後["people:list"] という住所（キャッシュキー）で保存する
  { tags: ["people"] }//microCMSのデータを関数を通して取得した全員分の人物リスト（データ）に ["people"] というタグをつけて一括管理する
);

export async function getPerson(slug: string): //getPerson(slug): 特定の人物の詳細情報を取得する関数を公開
Promise<Person | null> { //Person 型のデータか、または何も見つからなかった場合に null を返す
  return unstable_cache(
    async () => {
      const data = await microcms.getList<PeopleCMS>({//microcmsからPeopleCMS型のリストを取得
        endpoint: "people",
        queries: { filters: `slug[equals]${slug}`, limit: 1 },//microCMSに対して「people の中から、slug が〇〇であるたった1人を探してきてください」と明確に指示を出している
      });

      const p = data.contents[0];
      if (!p) return null;

      return {//キャッシュに保存されるデータの中身は以下の通り
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        description: p.description,
      };
    },
    ["people:bySlug", slug],//microCMSから受け取ったslug（引数）によってキャッシュキーが変わるので、slugを含めたキャッシュキーで定義する
    { tags: ["people", `people:${slug}`] }//microCMSから受け取ったslug（引数）によってタグが変わるので、slugを含めたタグで定義する
  )();
}

export function groupPeopleByCategory(people: Person[]): Record<string, Person[]> {//getpeople()関数の戻値を取得して、string（カテゴリー）とperson（人物情報）として返す
  return people.reduce((acc, person) => { //reduceを開始する。accは累積値、personは現在処理中の人物情報
    const category = person.category || "その他";//person.category に値があればそれを使い、もし値が空（または存在しない）ならば、代わりに"その他"を使う
    (acc[category] ??= []).push(person);//もしacc["~"]）が null または undefined なら（[] 空配列）を代入する（初めて読み取るカテゴリーの場合は空{}にperson（その人物の全ての情報）をpushだが、カテゴリーがすでにある場合は、既存のカテゴリーに人物情報がプッシュされる）
    return acc;//accで返されたものを戻り値とする
  }, {} as Record<string, Person[]>);//初期値は空の箱{}で最終的にはRecord<string, Person[]>型になるよ
}
