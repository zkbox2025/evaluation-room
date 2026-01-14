import { microcms } from "./microcms";
import { Person } from "@/types/person";

type PeopleCMS = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
};

export async function getPeople(): Promise<Person[]> {
  const data = await microcms.getList<PeopleCMS>({
    endpoint: "people",
    queries: { limit: 100 },
  });

  return data.contents.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
  }));
}

export async function getPerson(slug: string): Promise<Person | null> {
  const data = await microcms.getList<PeopleCMS>({
    endpoint: "people",
    queries: {
      filters: `slug[equals]${slug}`,
      limit: 1,
    },
  });

  const p = data.contents[0];
  if (!p) return null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
  };
}

export function groupPeopleByCategory(people: Person[]): Record<string, Person[]> {
  return people.reduce((acc, person) => {
    const category = person.category || "その他";
    (acc[category] ??= []).push(person);
    return acc;
  }, {} as Record<string, Person[]>);
}
