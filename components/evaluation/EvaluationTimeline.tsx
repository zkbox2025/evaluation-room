import type { Evaluation } from "@/domain/entities";///types/evaluationsからEvaluationの型だけをここで使えるように持ってきて！
import { groupEvaluationsByYear } from "@/utils/groupEvaluationsByYear";
import { EvaluationList } from "@/components/evaluation/EvaluationList";

type Props = {
  evaluations: Evaluation[];
};

export default function EvaluationTimeline({ evaluations }: Props) {
  const grouped = groupEvaluationsByYear(evaluations);
  const entries = Object.entries(grouped);

  return (
    <section className="mt-20">
        <ul className="space-y-16">
          {entries.map(([year, items]) => (
            <li key={year} className="relative">

              {/* 年＋評価 */}
              <div className="pl-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {year}
                </h3>

                <EvaluationList evaluations={items} />
              </div>
            </li>
          ))}
        </ul>

    </section>
  );
}