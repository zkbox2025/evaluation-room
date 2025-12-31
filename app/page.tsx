import Link from "next/link";
import { getPersons } from "@/lib/getPerson";

export default function Home() {
  const people = getPersons();

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex justify-center">
      <div className="max-w-4xl w-full px-8 py-20">
        <h1 className="text-4xl font-semibold text-gray-800 text-center">
          評価の部屋
        </h1>

        <p className="mt-4 text-center text-gray-500">
          人物ごとに集められたポジティブな評価
        </p>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {people.map((person) => (
            <Link
              key={person.slug}
              href={`/person/${person.slug}`}
              className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-gray-800">
                {person.name}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {person.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
