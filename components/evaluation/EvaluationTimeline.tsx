import type { Evaluation } from "@/domain/entities";///types/evaluationsからEvaluationの型だけをここで使えるように持ってきて！
import { groupEvaluationsByYear } from "@/utils/groupEvaluationsByYear";
import { EvaluationList } from "@/components/evaluation/EvaluationList";

type Props = {
  evaluations: Evaluation[];
};

export default function EvaluationTimeline({ evaluations }: Props) {
  const grouped = groupEvaluationsByYear(evaluations);//年ごとに仕分けされた評価データの配列（辞書）を返す関数を使う
  const entries = Object.entries(grouped);//辞書を配列のセットに変換（mapは「配列」にしか使えないので辞書を回せる形にするため）

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