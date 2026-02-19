import type { Evaluation } from "@/domain/entities";

export function groupEvaluationsByYear(
  evaluations: Evaluation[]
): Record<string, Evaluation[]> {
  return evaluations.reduce((acc, evaluation) => {
    const year = String(evaluation.year);
    (acc[year] ??= []).push(evaluation);
    return acc;
  }, {} as Record<string, Evaluation[]>);
}
