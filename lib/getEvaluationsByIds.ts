//microCMSからデータを取得し使いやすいように変換して返す関数

import { microcms } from "@/infrastructure/microcms/client";
import type { EvaluationCMS } from "@/infrastructure/microcms/types";
import type { Evaluation } from "@/domain/entities";
import { remark } from "remark";
import html from "remark-html";
import { normalizeFrom, normalizeKind } from "@/domain/rules";

export async function getEvaluationsByIds(ids: string[]): Promise<Evaluation[]> {//欲しいデータのIDを配列で受け取る。
  if (ids.length === 0) return [];//IDがなければ空の配列を返す

  const data = await microcms.getList<EvaluationCMS>({//microCMSの評価からデータ（ID）を持ってくる
    endpoint: "evaluations",
    queries: {
      ids: ids.join(","), // ← microCMSの複数ID取得
      limit: ids.length,
    },
  });

  const byId = new Map(data.contents.map((e) => [e.id, e]));//一度IDをキーにした辞書（オブジェクト）を作る

  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as EvaluationCMS[];//最初に受け取った ids の順番で辞書からデータを取り出すことで呼び出し側が期待した順番に整える

  return Promise.all(//全て処理が終わるのを待ってから返す
    ordered.map(async (e) => {
      const processed = await remark().use(html).process(e.content ?? "");//microCMSに入っている「Markdown形式のテキスト」を、ブラウザで表示できる「HTML形式」に変換する
      const year = e.year ?? new Date(e.date).getFullYear();//もし年データがなくても日付データから年を自動計算してセットする
      return {
        id: e.id,
        personSlug: e.person.slug,
        from: normalizeFrom(e.from),
        date: e.date,
        year,
        kind: normalizeKind(e.type),
        contentHtml: processed.toString(),
      };
    })
  );
}
