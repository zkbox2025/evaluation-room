import { microcms } from "./microcms";

type PeopleCMS = {
  id: string;
  slug: string;
  name?: string;
};

type EvalCMS = {
  id: string;
  from?: string;
  date?: string;
  person?: string | { id: string; slug?: string };
};

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  const all: T[] = [];
  const LIMIT = 100;
  let offset = 0;

  while (true) {
    const data = await microcms.getList<T>({
      endpoint,
      queries: { limit: LIMIT, offset },
    });

    all.push(...data.contents);

    if (data.contents.length < LIMIT) break;
    offset += LIMIT;
  }

  return all;
}

function pickRefId(person: EvalCMS["person"]): string | undefined {
  if (!person) return undefined;
  if (typeof person === "string") return person;
  if (typeof person === "object" && typeof person.id === "string") return person.id;
  return undefined;
}

export async function checkCMSIntegrity() {
  const people = await fetchAll<PeopleCMS>("people");
  const evaluations = await fetchAll<EvalCMS>("evaluations");

  const peopleIdSet = new Set(people.map((p) => p.id));
  const peopleSlugSet = new Set(people.map((p) => p.slug));

  // ① people の slug 重複チェック（事故りやすい）
  const slugCount = new Map<string, number>();
  for (const p of people) slugCount.set(p.slug, (slugCount.get(p.slug) ?? 0) + 1);
  const duplicatePeopleSlugs = Array.from(slugCount.entries())
    .filter(([, c]) => c >= 2)
    .map(([slug, count]) => ({ slug, count }));

  // ② evaluations -> person 参照が壊れてないか（最重要）
  const missingPersonRefs: Array<{
    evaluationId: string;
    personId?: string;
    from?: string;
    date?: string;
  }> = [];

  for (const e of evaluations) {
    const personId = pickRefId(e.person);
    if (!personId || !peopleIdSet.has(personId)) {
      missingPersonRefs.push({
        evaluationId: e.id,
        personId,
        from: e.from,
        date: e.date,
      });
    }
  }

  // ③ ついでに: people の slug のフォーマット（軽いバリデーション）
  const invalidPeopleSlugs = people
    .filter((p) => !/^[a-z0-9-]+$/.test(p.slug))
    .map((p) => ({ id: p.id, slug: p.slug }));

  const ok =
    duplicatePeopleSlugs.length === 0 &&
    missingPersonRefs.length === 0 &&
    invalidPeopleSlugs.length === 0;

  return {
    ok,
    summary: {
      peopleCount: people.length,
      evaluationsCount: evaluations.length,
      duplicatePeopleSlugs: duplicatePeopleSlugs.length,
      missingPersonRefs: missingPersonRefs.length,
      invalidPeopleSlugs: invalidPeopleSlugs.length,
    },
    details: {
      duplicatePeopleSlugs,
      missingPersonRefs,
      invalidPeopleSlugs,
      // 参考：slug一覧（必要なら）
      peopleSlugs: Array.from(peopleSlugSet).sort(),
    },
  };
}
