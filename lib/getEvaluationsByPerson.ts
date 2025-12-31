import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Evaluation } from "@/types/evaluation";

const evaluationsDirectory = path.join(
  process.cwd(),
  "contents/evaluations"
);

export async function getEvaluationsByPerson(
  slug: string
): Promise<Evaluation[]> {
  const dir = path.join(evaluationsDirectory, slug);

  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);

  const evaluations = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(raw);

      const processed = await remark()
        .use(html)
        .process(content);

      return {
        from: data.from,
        date: data.date,
        contentHtml: processed.toString(),
      };
    })
  );

  return evaluations.sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );
}
