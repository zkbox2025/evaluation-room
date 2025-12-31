import { getPerson } from "@/lib/getPerson";
import { getEvaluationsByPerson } from "@/lib/getEvaluationsByPerson";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;

  const person = getPerson(slug);
  const evaluations = await getEvaluationsByPerson(slug);

  if (!person) return <p>人物が見つかりません</p>;

  return (
    <main className="max-w-3xl mx-auto py-20">
      <h1 className="text-4xl font-bold">{person.name}</h1>
      <p className="mt-4 text-gray-600">{person.description}</p>

      <section className="mt-16 space-y-12">
        {evaluations.map((e, i) => (
          <article key={i}>
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: e.contentHtml }}
            />
            <p className="mt-4 text-right text-sm text-gray-500">
              ― {e.from}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
