import { microcms } from "./microcms";//lib/microcms.tsからmicrosmsだけをここで使えるように持ってきて！
import { Evaluation } from "@/types/evaluations";///types/evaluationsからEvaluationだけをここで使えるように持ってきて！
import { remark } from "remark";//インストール済みのremarkからMarkdownを変換するためのライブラリだけをここで使えるように持ってきて！
import html from "remark-html";//インストール済みのremark-htmlからremarkと組み合わせてHTMLに出力するライブラリだけをここで使えるように持ってきて！
import { unstable_cache } from "next/cache";//next/cacheからunstable_cacheだけをここで使えるように持ってきて！

type PeopleCMS = {//microCMSから取得する人物データの型定義
  id: string;
  slug: string;
};

type PersonRef = {//microCMSから取得する人物データの型定義
  id: string;
  slug?: string; // slugは返らない可能性もあるので optional（入ってるかもしれないし入ってない（nullやundefined）かもしれない）
};

type EvalCMS = {//microCMSから取得する評価データの型定義
  id: string;
  person: PersonRef | string; // object or id string の両対応
  from?: string;
  date: string;
  year?: number;
  type?: string;
  content?: string;
};

async function getPersonIdBySlug(slug: string): Promise<string | null> {//microCMSからのslugからpersonIdを取得する関数
  const data = await microcms.getList<PeopleCMS>({//microcmsからPeopleCMS型のリストを取得
    endpoint: "people",//microCMSの"people"エンドポイントからデータを取得
    queries: { filters: `slug[equals]${slug}`, limit: 1 },//microCMSに対して「people の中から、slug が〇〇であるたった1人を探してきてください」と明確に指示を出している
  });
  return data.contents[0]?.id ?? null;//該当する人物がいればそのidを返し、いなければnullを返す
}

async function fetchAllEvaluationsByPersonId(personId: string): Promise<EvalCMS[]> {//personIdからその人に紐づく全ての評価データを取得する関数
  const all: EvalCMS[] = [];//評価データを格納するための空の配列
  const LIMIT = 100;  //一度に取得するデータの上限
  let offset = 0; //データ取得の開始位置を示すオフセット値 kokokara

  while (true) {
    const data = await microcms.getList<EvalCMS>({
      endpoint: "evaluations",
      queries: {
        // ✅ 参照は id で equals するのが安定
        filters: `person[equals]${personId}`,
        orders: "-date",
        limit: LIMIT,
        offset,
      },
    });

    all.push(...data.contents);

    if (data.contents.length < LIMIT) break;
    offset += LIMIT;
  }

  return all;
}

export async function getEvaluationsByPerson(slug: string): Promise<Evaluation[]> {//getEvaluationsByPerson: 特定の人物に紐づく評価を取得する関数を公開
  const cached = unstable_cache(
    async () => {
      const personId = await getPersonIdBySlug(slug);
      if (!personId) return []; // 人物がいないなら評価もない

      const contents = await fetchAllEvaluationsByPersonId(personId);

      const evaluations = await Promise.all(
        contents.map(async (e) => {
          const processed = await remark().use(html).process(e.content ?? "");
          const year = e.year ?? new Date(e.date).getFullYear();

          // personSlug はページslug（URL）をそのまま入れるのが一番事故がない
          return {
            id: e.id,
            personSlug: slug,
            from: e.from ?? "不明",
            date: e.date,
            year,
            type: e.type ?? "quote",
            contentHtml: processed.toString(),
          };
        })
      );

      return evaluations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    ["evaluations:byPerson", slug],
    { tags: ["evaluations", `evaluations:${slug}`] }
  );

  return cached();
}
