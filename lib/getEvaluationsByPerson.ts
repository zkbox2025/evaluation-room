import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Evaluation } from "@/types/evaluations";

const evaluationsRoot = path.join(
  process.cwd(),
  "contents/evaluations"
);

export async function getEvaluationsByPerson(
  slug: string
): Promise<Evaluation[]> {
  const dir = path.join(evaluationsRoot, slug);

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

      const date = data.date;

      return {
        id: file.replace(/\.md$/, ""),
        personSlug: slug,
        contentHtml: processed.toString(),
        from: data.from ?? "不明",
        date,
        year: data.year ?? new Date(date).getFullYear(),
        type: data.type ?? "quote",
      };
    })
  );

  return evaluations.sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );
}



