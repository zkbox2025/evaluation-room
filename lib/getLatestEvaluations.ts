import { microcms } from "@/infrastructure/microcms/client";//src/infrastructure/microcms/client.tsからmicrosmsだけをここで使えるように持ってきて！
import type { Evaluation } from "@/domain/entities";//types/evaluations.tsからEvaluationの型だけをここで使えるように持ってきて！
import { remark } from "remark";//インストール済みのremarkからMarkdownを変換するためのライブラリだけをここで使えるように持ってきて！
import html from "remark-html";//インストール済みのremark-htmlからremarkと組み合わせてHTMLに出力するライブラリだけをここで使えるように持ってきて！
import { unstable_cache } from "next/cache";//next/cacheからunstable_cacheだけをここで使えるように持ってきて！
import { normalizeKind, normalizeFrom } from "@/domain/rules";//domain/rulesからnormalizeKind関数だけをここで使えるように持ってきて！
import type { EvaluationCMS } from "@/infrastructure/microcms/types";



export async function getLatestEvaluations(limit = 5): Promise<Evaluation[]> {//getLatestEvaluations: 最新の評価を取得する関数を公開
  const cached = unstable_cache(
    async () => {
      const data = await microcms.getList<EvaluationCMS>({//microcmsからEvalCMS型のリストを取得
        endpoint: "evaluations",//microCMSの"evaluations"エンドポイントからデータを取得
        queries: { orders: "-date", limit },//date"（評価の日付）を新しい順に並べ替えて、limitで指定された数（５）だけ取得
      });

      return Promise.all(//Promise.allは、複数の非同期処理を並列で実行し、すべての処理が完了したときに結果をまとめて返す
        data.contents.map(async (e) => {//取得したデータをEvaluation型に変換して返す
          const processed = await remark().use(html).process(e.content ?? "");//remarkとremark-htmlを使って、Markdown形式のcontentをHTMLに変換
          const year = e.year ?? new Date(e.date).getFullYear();//もしe.yearが存在すればそれを使い、存在しなければe.dateから年を取得して代わりに使う

          return {
            id: e.id,
            personSlug: e.person.slug,
            from: normalizeFrom(e.from),//e.fromをnormalizeFrom関数に通して保存
            date: e.date,
            year,
            kind: normalizeKind(e.type),//e.typeをnormalizeKind関数に通してkindに変換して保存
            contentHtml: processed.toString(),//HTMLに変換されたcontentを文字列として格納
          };
        })
      );
    },


    ["evaluations:latest", String(limit)],//microCMSのデータを関数に通して取得した最新の評価リスト（データ）を取得した後に、limit（引数）を含めたキャッシュキーで保存する(limitを変えた場合に保存場所を別にするため)
    { tags: ["evaluations", "evaluations:latest"] }//microCMSのデータを関数に通して取得した最新の評価リスト（データ）をevaluationsとevaluations:latestというタグをつけて一括管理する
  );

  return cached();//キャッシュに保存された最新の評価リスト（データ）を呼び出し元に返す
}
