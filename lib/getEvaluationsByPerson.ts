import { microcms } from "./microcms";
import { Evaluation } from "@/types/evaluations";
import { remark } from "remark";
import html from "remark-html";

type EvalCMS = {
  id: string;
  personSlug: string;
  from: string;
  date: string;
  year?: number;
  type?: string;
  content: string;
};

async function fetchAllEvaluationsByPerson(slug: string): Promise<EvalCMS[]> {
  const all: EvalCMS[] = [];
  const LIMIT = 100;
  let offset = 0;

  while (true) {
    const data = await microcms.getList<EvalCMS>({
      endpoint: "evaluations",
      queries: {
        filters: `personSlug[equals]${slug}`,
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

export async function getEvaluationsByPerson(slug: string): Promise<Evaluation[]> {
  const contents = await fetchAllEvaluationsByPerson(slug);

  const evaluations = await Promise.all(
    contents.map(async (e) => {
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

  return evaluations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
