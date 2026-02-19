import type { Evaluation } from "@/domain/entities";///types/evaluationsからEvaluationの型だけをここで使えるように持ってきて！
import { EvaluationCard } from "./EvaluationCard";

type Props = {//受け取るデータである評価リストのコンポーネント（UIの部品）のプロパティ（色や形の指示書）の型を定義する
  evaluations: Evaluation[];//評価の配列
};

export function EvaluationList({ evaluations }: Props) {//評価データを受け取って、それを1つずつカードの形に並べて表示するコンポーネントの関数
  return (
    <section className="">
      
      <div className="space-y-12">

{evaluations.map((e) => (//リストの中身を1つずつ取り出して、別の形に変換して新しいリストを作る.取り出した評価データをeとして扱う
  <EvaluationCard key={e.id} {...e} />//評価データを1つずつEvaluationCardコンポーネントに渡して表示
))}

      </div>
    </section>
  );
}
