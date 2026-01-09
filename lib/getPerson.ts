import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Person } from "@/types/person";

const peopleDirectory = path.join(
  process.cwd(),
  "contents/people"
);

/**
 * 人物一覧を取得（トップページ用）
 */
export function getPersons(): Person[] {
  const dirNames = fs.readdirSync(peopleDirectory);

  return dirNames.map((slug) => {
    const fullPath = path.join(
      peopleDirectory,
      slug,
      "index.md"
    );

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);

    return {
      slug,
      name: data.name,
      category: data.category,
      description: data.description,
    };
  });
}

/**
 * 人物を1人取得（個別ページ用）
 */
export function getPerson(slug: string): Person | null {
  const fullPath = path.join(
    peopleDirectory,
    slug,
    "index.md"
  );

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data } = matter(fileContents);

  return {
    slug,
    name: data.name,
    category: data.category,
    description: data.description,
  };
}

/**
 * 人物をカテゴリ（ジャンル）ごとにグループ化
 */
export function groupPeopleByCategory(
  people: Person[]
): Record<string, Person[]> {
  return people.reduce((acc, person) => {
    const category = person.category || "その他";

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(person);
    return acc;
  }, {} as Record<string, Person[]>);
}
