import { microcms } from "./microcms";
import { Evaluation } from "@/types/evaluations";
import { remark } from "remark";
import html from "remark-html";

type EvalCMS = {
  personSlug: string;
  from: string;
  date: string;
  year?: number;
  type?: string;
  content: string;
};

export async function getLatestEvaluations(limit = 5): Promise<Evaluation[]> {
  const data = await microcms.getList<EvalCMS>({
    endpoint: "evaluations",
    queries: { orders: "-date", limit },
  });

  return Promise.all(
    data.contents.map(async (e) => {
      const processed = await remark().use(html).process(e.content ?? "");
      const year = e.year ?? new Date(e.date).getFullYear();

      return {
        id: e.id,
        personSlug: e.personSlug,
        from: e.from ?? "不明",
        date: e.date,
        year,
        type: e.type ?? "quote",
        contentHtml: processed.toString(),
      };
    })
  );
}
