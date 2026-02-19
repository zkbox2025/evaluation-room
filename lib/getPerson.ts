import { microcms } from "@/infrastructure/microcms/client";
import type { Person } from "@/domain/entities";
import { unstable_cache } from "next/cache";
import type { PersonCMS } from "@/infrastructure/microcms/types";
import { toDomainPerson } from "@/domain/mappers/person";


export const getPeople = unstable_cache(
  async (): Promise<Person[]> => {
    const data = await microcms.getList<PersonCMS>({
      endpoint: "people",
      queries: { limit: 100, depth: 2 },
    });

    return data.contents.map(toDomainPerson);
  },
  ["people:list"],
  { tags: ["people"] }
);

export async function getPerson(slug: string): Promise<Person | null> {
  return unstable_cache(
    async () => {
      const data = await microcms.getList<PersonCMS>({
        endpoint: "people",
        queries: { filters: `slug[equals]${slug}`, limit: 1 },
      });

      const p = data.contents[0];
      if (!p) return null;

      return toDomainPerson(p);
    },
    ["people:bySlug", slug],
    { tags: ["people", `people:${slug}`] }
  )();
}

export function groupPeopleByCategory(people: Person[]): Record<string, Person[]> {
  return people.reduce((acc, person) => {
    const categoryName = person.category?.name || "その他";
    (acc[categoryName] ??= []).push(person);
    return acc;
  }, {} as Record<string, Person[]>);
}
