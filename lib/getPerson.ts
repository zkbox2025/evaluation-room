import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Person } from "@/types/person";

const peopleDirectory = path.join(
  process.cwd(),
  "contents/people"
);

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
      genre: data.genre,
      description: data.description,
    };
  });
}

export function getPerson(slug: string): Person | null {
  const fullPath = path.join(
    peopleDirectory,
    slug,
    "index.md"
  );

  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data } = matter(fileContents);

  return {
    slug,
    name: data.name,
    genre: data.genre,
    description: data.description,
  };
}
