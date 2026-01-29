import Link from "next/link";
import { getPeople, groupPeopleByCategory } from "@/lib/getPerson";
import { getLatestEvaluations } from "@/lib/getLatestEvaluations";

export default async function Home() {
  const people = await getPeople();//getPeople()を実行して、戻り値（Person[] 型のリスト）を peopleという変数で受け取る
  const grouped = groupPeopleByCategory(people);//peopleという変数を、groupPeopleByCategory関数の引数として渡す
  const latest = await getLatestEvaluations(5);

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-4xl w-full px-8 py-20">
        <h1 className="text-4xl font-semibold text-center">評価の部屋</h1>
<p className="mt-4 text-center text-sm text-gray-500">
  people: {people.length} / latest: {latest.length}
</p>


        {/* ① 最新評価 */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold mb-6">最新の評価</h2>

          <div className="space-y-6">
            {latest.map((e) => (
              <Link
                key={e.id}
                href={`/person/${e.personSlug}`}
                className="block bg-white p-6 rounded-xl shadow-sm"
              >
                <div
                  className="
                    prose prose-neutral max-w-none
                    prose-blockquote:border-l-0
                    prose-blockquote:pl-0
                    prose-blockquote:before:content-none
                  "
                  dangerouslySetInnerHTML={{ __html: e.contentHtml }}
                />
                <p className="mt-2 text-xs text-gray-400">slug: {e.personSlug}</p>

              </Link>
            ))}
          </div>
        </section>

        {/* ② ジャンル別人物 */}
        <section className="mt-20 space-y-12">
          {Object.entries(grouped).map(([category, persons]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4">{category}</h2>

              <div className="grid grid-cols-2 gap-4">
                {persons.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/person/${p.slug}`}
                    className="bg-white p-4 rounded-lg text-center"
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
