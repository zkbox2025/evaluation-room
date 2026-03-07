// src/lib/aiReview/snapshot.ts
import { htmlToText } from "@/viewmodels/formatters";
import type { Person, Evaluation } from "@/domain/entities";

export type ReviewTargetType = "top" | "person" | "likes" | "favorites";

export type PersonReviewSnapshot = {
  targetType: "person";
  targetKey: string; // personSlug
  generatedAt: string; // ISO
  person: {
    slug: string;
    name: string;
    description: string;
    categoryName: string;
    categorySlug: string;
  };
  evaluations: Array<{
    id: string;
    from: string;
    date: string;
    year: number;
    kind: string;
    textPlain: string; // HTML→テキスト
  }>;
  stats: {
    evaluationCount: number;
    includedEvaluationCount: number;
  };
};

export type TopReviewSnapshot = {
  targetType: "top";
  targetKey: null;
  generatedAt: string;
  latestEvaluations: Array<{
    id: string;
    personSlug: string;
    from: string;
    date: string;
    year: number;
    kind: string;
    textPlain: string;
  }>;
  categories: Array<{
    categorySlug: string;
    categoryName: string;
    personCount: number;
    topPersons: Array<{ slug: string; name: string }>;
  }>;
  stats: {
    peopleCount: number;
    latestEvaluationCount: number;
  };
};

export type LikesReviewSnapshot = {
  targetType: "likes";
  targetKey: null;
  generatedAt: string;
  likes: Array<{
    evaluationId: string;
    personSlug: string;
    from: string;
    date: string;
    year: number;
    kind: string;
    textPlain: string;
  }>;
  stats: { likeCount: number; includedCount: number };
};

export type FavoritesReviewSnapshot = {
  targetType: "favorites";
  targetKey: null;
  generatedAt: string;
  favorites: Array<{
    personSlug: string;
    personName: string;
    personDescription: string;
    categoryName: string;
  }>;
  stats: { favoriteCount: number; includedCount: number };
};

export type ReviewSnapshot =
  | PersonReviewSnapshot
  | TopReviewSnapshot
  | LikesReviewSnapshot
  | FavoritesReviewSnapshot;

  export function buildPersonReviewSnapshot(args: {
  person: Person;
  evaluations: Evaluation[];
  takeLatest?: number; // N件
}): PersonReviewSnapshot {
  const { person, evaluations, takeLatest = 5 } = args;

  const latest = [...evaluations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, takeLatest);

  return {
    targetType: "person",
    targetKey: person.slug,
    generatedAt: new Date().toISOString(),
    person: {
      slug: person.slug,
      name: person.name,
      description: person.description ?? "",
      categoryName: person.category.name,
      categorySlug: person.category.slug,
    },
    evaluations: latest.map((e) => ({
      id: e.id,
      from: e.from,
      date: e.date,
      year: e.year,
      kind: e.kind,
      textPlain: htmlToText(e.contentHtml),
    })),
    stats: {
      evaluationCount: evaluations.length,
      includedEvaluationCount: latest.length,
    },
  };
}

export function buildTopReviewSnapshot(args: {
  people: Person[];
  grouped: Record<string, Person[]>; // groupPeopleByCategory の結果
  latestEvaluations: Evaluation[];
  takeLatest?: number;
  takeTopPersonsPerCategory?: number;
}): TopReviewSnapshot {
  const {
    people,
    grouped,
    latestEvaluations,
    takeLatest = 5,
    takeTopPersonsPerCategory = 3,
  } = args;

  const latest = latestEvaluations.slice(0, takeLatest);

  const categories = Object.entries(grouped).map(([categoryName, persons]) => {
    const categorySlug = persons[0]?.category?.slug ?? "uncategorized";
    const topPersons = [...persons]
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .slice(0, takeTopPersonsPerCategory)
      .map((p) => ({ slug: p.slug, name: p.name }));

    return {
      categorySlug,
      categoryName,
      personCount: persons.length,
      topPersons,
    };
  });

  return {
    targetType: "top",
    targetKey: null,
    generatedAt: new Date().toISOString(),
    latestEvaluations: latest.map((e) => ({
      id: e.id,
      personSlug: e.personSlug,
      from: e.from,
      date: e.date,
      year: e.year,
      kind: e.kind,
      textPlain: htmlToText(e.contentHtml),
    })),
    categories,
    stats: {
      peopleCount: people.length,
      latestEvaluationCount: latest.length,
    },
  };
}

export function buildLikesReviewSnapshot(args: {
  evaluations: Evaluation[];
  takeLatest?: number;
}): LikesReviewSnapshot {
  const { evaluations, takeLatest = 10 } = args;

  const latest = [...evaluations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, takeLatest);

  return {
    targetType: "likes",
    targetKey: null,
    generatedAt: new Date().toISOString(),
    likes: latest.map((e) => ({
      evaluationId: e.id,
      personSlug: e.personSlug,
      from: e.from,
      date: e.date,
      year: e.year,
      kind: e.kind,
      textPlain: htmlToText(e.contentHtml),
    })),
    stats: {
      likeCount: evaluations.length,
      includedCount: latest.length,
    },
  };
}

export function buildFavoritesReviewSnapshot(args: {
  people: Person[];
  takeLatest?: number;
}): FavoritesReviewSnapshot {
  const { people, takeLatest = 20 } = args;

  const selected = [...people]
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .slice(0, takeLatest);

  return {
    targetType: "favorites",
    targetKey: null,
    generatedAt: new Date().toISOString(),
    favorites: selected.map((p) => ({
      personSlug: p.slug,
      personName: p.name,
      personDescription: p.description ?? "",
      categoryName: p.category.name,
    })),
    stats: {
      favoriteCount: people.length,
      includedCount: selected.length,
    },
  };
}