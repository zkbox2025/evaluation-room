import fs from "fs";
import path from "path";
import { getEvaluationsByPerson } from "./getEvaluationsByPerson";
import { Evaluation } from "@/types/evaluations";

const evaluationsRoot = path.join(
  process.cwd(),
  "contents/evaluations"
);

export async function getLatestEvaluations(
  limit: number
): Promise<Evaluation[]> {
  const personSlugs = fs.readdirSync(evaluationsRoot);

  const allEvaluations: Evaluation[] = [];

  for (const slug of personSlugs) {
    const evaluations = await getEvaluationsByPerson(slug);
    allEvaluations.push(...evaluations);
  }

  return allEvaluations
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, limit);
}
