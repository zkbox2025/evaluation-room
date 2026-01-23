import { microcms } from "./microcms";
import { Evaluation } from "@/types/evaluations";
import { remark } from "remark";
import html from "remark-html";
import { unstable_cache } from "next/cache";

type PersonRef = {
  id: string;
  slug: string;
};

type EvalCMS = {
  id: string;
  person: PersonRef;
  from: string;
  date: string;
  year?: number;
  type?: string;
  content: string;
};

export async function getLatestEvaluations(limit = 5): Promise<Evaluation[]> {
  const cached = unstable_cache(
    async () => {
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
            personSlug: e.person.slug,
            from: e.from ?? "不明",
            date: e.date,
            year,
            type: e.type ?? "quote",
            contentHtml: processed.toString(),
          };
        })
      );
    },
    ["evaluations:latest", String(limit)],
    { tags: ["evaluations", "evaluations:latest"] }
  );

  return cached();
}
