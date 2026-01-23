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
  person: PersonRef; // microCMSの「コンテンツ参照」
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
        // 参照先のslugで絞る（microCMS側がこの構文を許す前提）
        filters: `person.slug[equals]${slug}`,
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

// ✅ slugごとにキャッシュを分離するため、外側でslugを受けて中でunstable_cache
export async function getEvaluationsByPerson(slug: string): Promise<Evaluation[]> {
  const cached = unstable_cache(
    async () => {
      const contents = await fetchAllEvaluationsByPerson(slug);

      const evaluations = await Promise.all(
        contents.map(async (e) => {
          const processed = await remark().use(html).process(e.content ?? "");
          const year = e.year ?? new Date(e.date).getFullYear();

          return {
            id: e.id,
            personSlug: e.person.slug, // ←参照からslugを取る
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
    },
    // キャッシュキー（slug込み）
    ["evaluations:byPerson", slug],
    // タグ（全体 + 人物別）
    { tags: ["evaluations", `evaluations:${slug}`] }
  );

  return cached();
}
