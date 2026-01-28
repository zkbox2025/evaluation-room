import { microcms } from "./microcms";　//lib/microcms.tsからmicrosmsだけをここで使えるように持ってきて！
import { Evaluation } from "@/types/evaluations";///types/evaluationsからEvaluationだけをここで使えるように持ってきて！
import { remark } from "remark";
import html from "remark-html";
import { unstable_cache } from "next/cache";

type PeopleCMS = {
  id: string;
  slug: string;
};

type PersonRef = {
  id: string;
  slug?: string; // slugは返らない可能性もあるので optional
};

type EvalCMS = {
  id: string;
  person: PersonRef | string; // object or id string の両対応
  from?: string;
  date: string;
  year?: number;
  type?: string;
  content?: string;
};

async function getPersonIdBySlug(slug: string): Promise<string | null> {
  const data = await microcms.getList<PeopleCMS>({
    endpoint: "people",
    queries: { filters: `slug[equals]${slug}`, limit: 1 },
  });
  return data.contents[0]?.id ?? null;
}

async function fetchAllEvaluationsByPersonId(personId: string): Promise<EvalCMS[]> {
  const all: EvalCMS[] = [];
  const LIMIT = 100;
  let offset = 0;

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

export async function getEvaluationsByPerson(slug: string): Promise<Evaluation[]> {
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
