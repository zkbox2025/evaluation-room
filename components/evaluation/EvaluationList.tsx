import { EvaluationCard } from "./EvaluationCard";

type Evaluation = {
  contentHtml: string;
  from: string;
};

type Props = {
  evaluations: Evaluation[];
};

export function EvaluationList({ evaluations }: Props) {
  return (
    <section className="">
      
      <div className="space-y-12">
        {evaluations.map((e, i) => (
          <EvaluationCard key={i} {...e} />
        ))}
      </div>
    </section>
  );
}
