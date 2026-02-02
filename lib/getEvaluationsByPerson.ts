import { microcms } from "./microcms";//lib/microcms.tsからmicrosmsだけをここで使えるように持ってきて！
import { Evaluation } from "@/types/evaluations";///types/evaluationsからEvaluationだけをここで使えるように持ってきて！
import { remark } from "remark";//インストール済みのremarkからMarkdownを変換するためのライブラリだけをここで使えるように持ってきて！
import html from "remark-html";//インストール済みのremark-htmlからremarkと組み合わせてHTMLに出力するライブラリだけをここで使えるように持ってきて！
import { unstable_cache } from "next/cache";//next/cacheからunstable_cacheだけをここで使えるように持ってきて！

type PeopleCMS = {//microCMSのpeople(エンドポンド)から取得する人物そのもののデータの型定義
  id: string;
  slug: string;
};

type PersonRef = {//microCMSのevaluation(エンドポンド)から取得する参照用データの型定義（この評価は誰のものかを示す紐付けデータ）
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

//microCMSのAPIで「この人の評価だけを抜き出したい！」と命令（フィルタリング）する時は、
//slug よりもシステム固有の ID を使ったほうが動作が安定し、ミスが少なくなる。
//そのため、まず最初に slug を ID に変換するステップが必要になる。

async function fetchAllEvaluationsByPersonId(personId: string): Promise<EvalCMS[]> {//personIdからその人に紐づく全ての評価データを取得する関数
  const all: EvalCMS[] = [];//関数を通した後のpersonIdからその人に紐づく全ての評価データを格納するための空の配列
  const LIMIT = 100;  //一度に取得するデータの上限
  let offset = 0; //データ取得の開始位置を示すオフセット値 

  while (true) {//無限ループ。microCMSのAPIは、一度に取得できる件数に上限がある（通常100件）ため、100件以上ある場合は、繰り返しAPIを呼び出して全件取得する必要がある。
    const data = await microcms.getList<EvalCMS>({//microcmsからEvalCMS型のリストを取得
      endpoint: "evaluations",
      queries: {
        filters: `person[equals]${personId}`,//personIdとevaluation(エンドポンド)のpersonが参照している人物のIDが等しい評価データだけを取得するようにフィルタリング
        orders: "-date",//date"（評価の日付）を新しい順に並べ替え
        limit: LIMIT,//100件ずつ取得
        offset,//オフセット値を指定して、次の100件を取得
      },
    });

    all.push(...data.contents);//関数を通して取得した評価データをall配列に追加

    if (data.contents.length < LIMIT) break;//取得したデータがLIMIT未満なら、もう取得するデータがないのでループを終了
    offset += LIMIT;//次の取得開始位置を更新
  }

  return all;//personIdからその人に紐づく全ての評価データを呼び出し元に返す
}

export async function getEvaluationsByPerson(slug: string): Promise<Evaluation[]> {//特定の人物に紐づく評価を取得する関数を公開
  const cached = unstable_cache(//unstable_cacheでキャッシュ化
    async () => {
      const personId = await getPersonIdBySlug(slug);//slugからpersonIdを取得
      if (!personId) return []; // 人物がいないなら評価もない

      const contents = await fetchAllEvaluationsByPersonId(personId);//personIdからその人に紐づく全ての評価データを取得

      const evaluations = await Promise.all(//Promise.allは、複数の非同期処理を並列で実行し、すべての処理が完了したときに結果をまとめて返す
        contents.map(async (e) => {//取得したデータをEvaluation型に変換して返す
          const processed = await remark().use(html).process(e.content ?? "");//remarkとremark-htmlを使って、Markdown形式のcontentをHTMLに変換
          const year = e.year ?? new Date(e.date).getFullYear();//もしe.yearが存在すればそれを使い、存在しなければe.dateから年を取得して代わりに使う

          // personSlug はページslug（URL）をそのまま入れるのが一番事故がない
          return {
            id: e.id,
            personSlug: slug,
            from: e.from ?? "不明",
            date: e.date,
            year,
            type: e.type ?? "quote",//もしe.typeが存在しなければ"quote"を代わりに使う
            contentHtml: processed.toString(),//HTMLに変換されたcontentを文字列として格納
          };
        })
      );

      return evaluations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },//日付が新しい順（降順）に並び替えて返す。数字が大きい（＝日付がより新しい）ものがリストの先頭に並ぶ。

    ["evaluations:byPerson", slug],//microCMSのデータを関数に通して取得した特定の人物に紐づく評価リスト（データ）を取得した後に、slug（引数）を含めたキャッシュキーで保存する(slugごとに保存場所を別にするため)
    { tags: ["evaluations", `evaluations:${slug}`] }//microCMSのデータを関数に通して取得した特定の人物に紐づく評価リスト（データ）をevaluationsとevaluations:〇〇というslugを含めたタグをつけて一括管理する
  );

  return cached();//キャッシュに保存された特定の人物に紐づく評価リスト（データ）を呼び出し元に返す
}
