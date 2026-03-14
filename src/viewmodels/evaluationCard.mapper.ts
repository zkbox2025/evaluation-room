//prismaとmicroCMSからデータを取ってきて、評価カード（EvaluationCardVM）を作るための関数群（サーバー側専用）

// src/viewmodels/evaluationCard.mapper.ts
import type { Evaluation, Person, PersonSlug, EvaluationContentId, ViewerId } from "@/domain/entities";
import type { EvaluationCardVM } from "@/viewmodels/evaluationCard";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { formatDateLabel } from "@/viewmodels/formatters";
import { createUnknownPerson } from "@/domain/mappers/person";



async function getViewerReactionSets(params: {//viewerIDを使って「いいね」と「お気に入り」状態を一気に取る関数。paras=引数（パラメーター）でありURLではない。
  viewerId: ViewerId;
  evaluationIds: EvaluationContentId[];
  personSlugs: PersonSlug[];
}): Promise<{ likedEvaluationIds: Set<EvaluationContentId>; favoritedPersonSlugs: Set<PersonSlug> }> {//引数としてviewerIdと評価IDのリストと人物スラッグのリストを受け取る
  const { viewerId, evaluationIds, personSlugs } = params;//呼び出し元から渡された引数からviewerIdと評価IDのリストと人物スラッグのリストを取り出す
 
  if (evaluationIds.length === 0 && personSlugs.length === 0) {
  return {
    likedEvaluationIds: new Set<EvaluationContentId>(),
    favoritedPersonSlugs: new Set<PersonSlug>(),
  };
}
  const [likes, favorites] = await Promise.all([//DBからviewerIdを使って、その人が「いいね」した評価IDのリストと「お気に入り」にした人物スラッグのリストを一気に取得（2回のDBアクセスを同時進行にする）
    prisma.like.findMany({//viewerIdと呼び出し元から渡された（ページ内の）evaluationIDを使って、DBの「いいね」テーブルの中からいいね済み評価の配列を持ってくる
      where: { viewerId, evaluationId: { in: evaluationIds } }, // ←その人のviewerIdであるのと呼び出し元から渡されたevaluationIdがいいね済みであれば（テーブルにあれば）持ってくる
      select: { evaluationId: true },
    }),
    prisma.favorite.findMany({//viewerIdと呼び出し元から渡された（ページ内の）personslugを使って、DBの「お気に入り」テーブルの中からお気に入り済み評価の配列を持ってくる
      where: { viewerId, personSlug: { in: personSlugs } },// ←その人のviewerIdであるのと呼び出し元から渡されたpersonslugがお気に入り済みであれば（テーブルにあれば）持ってくる
      select: { personSlug: true },
    }),
  ]);

  return {//DBから取得した「いいね」評価IDの配列と「お気に入り」人物スラッグの配列を、それぞれSetに変換して返す（Setにすることで、後で判定が高速になる）
    likedEvaluationIds: new Set(likes.map((l) => l.evaluationId as EvaluationContentId)),
    favoritedPersonSlugs: new Set(favorites.map((f) => f.personSlug as PersonSlug)),
  };
}

export function toEvaluationCardVM(args: {//評価カードVMを作るための関数
  evaluation: Evaluation;
  subject: Person;
  likedEvaluationIds: Set<EvaluationContentId>;
  favoritedPersonSlugs: Set<PersonSlug>;
}): EvaluationCardVM {
  const { evaluation, subject, likedEvaluationIds, favoritedPersonSlugs } = args;//呼び出し元から渡された引数から評価データと被評価者データと「いいね」評価IDの集合と「お気に入り」人物スラッグの集合を取り出す

  return {
    id: evaluation.id,
    subject: {
      slug: subject.slug,
      name: subject.name,
      categoryName: subject.category.name,
    },
    from: evaluation.from,
    dateLabel: formatDateLabel(evaluation.date),
    kind: evaluation.kind,
    contentHtml: evaluation.contentHtml,
    isLiked: likedEvaluationIds.has(evaluation.id),
    isFavorited: favoritedPersonSlugs.has(subject.slug),
  };
}

/**
 * 個人ページ用：評価一覧 + 人物を受け取り、表示用VMに合成する
 * viewerが無い場合は isLiked/isFavorited は false
 */
export async function buildEvaluationCardVMsForPersonPage(params: {//個人ページ用に評価カードVMのリストを作るための関数
  evaluations: Evaluation[];
  person: Person; 
}): Promise<EvaluationCardVM[]> {
  const subject = params.person;

  const viewer = await getOrCreateViewer();//deviceIDを使ってviewerオブジェクト（viewerID入り）を取得し閲覧者を特定する関数を呼び出す（なければ新規で作る）

  // viewer無しでもページを壊さない
  if (!viewer) {//viewerオブジェクトが取得できなかった場合（Cookieが無効など）、評価カードVMのリストを作るための処理を行う
    const emptyLiked = new Set<EvaluationContentId>();
    const emptyFav = new Set<PersonSlug>();
    return params.evaluations.map((evaluation) =>//評価データのリストを1つずつ取り出して評価カードVMに変換する（この場合、viewerがいないので「いいね」と「お気に入り」は全てfalseになる）
      toEvaluationCardVM({ evaluation, subject, likedEvaluationIds: emptyLiked, favoritedPersonSlugs: emptyFav })
    );
  }

  const evalIds = params.evaluations.map((e) => e.id);//引数として取得した評価データのリストから評価IDのリストを作る
  const { likedEvaluationIds, favoritedPersonSlugs } = await getViewerReactionSets({//DBからviewerの「いいね」と「お気に入り」状態を一気に取る関数を呼び出す
    viewerId: viewer.id,
    evaluationIds: evalIds,
    personSlugs: [subject.slug],
  });

  return params.evaluations.map((evaluation) =>//評価データのリストを1つずつ取り出して（いいね/お気に入り付き）評価カードVMに変換する
    toEvaluationCardVM({ evaluation, subject, likedEvaluationIds, favoritedPersonSlugs })
  );
}


// 追加：トップページ用
export async function buildEvaluationCardVMsForTopPage(params: {//トップページ用に評価カードVMのリストを作るための関数
  latestEvaluations: Evaluation[];
  people: Person[];
}): Promise<EvaluationCardVM[]> {//引数として最新の評価データのリストと人物データのリストを受け取る（人物データはmicroCMS由来でカテゴリーが文字列の形）
  const { latestEvaluations, people } = params;//呼び出し元から渡された引数から最新の評価データのリストと人物データのリストを取り出す

  // peopleのリスト（配列）をslugだけで詳細がわかるPerson(domain) の辞書（オブジェクト）にする関数を使って、URL用のスラッグをキー、Person型のデータを値とする辞書に変換して保存（評価データの被評価者のスラッグから人物データを簡単に参照できるようにするため）
  const peopleBySlug: Record<PersonSlug, Person> = Object.fromEntries(//peopleのリストを、URL用のスラッグをキー、Person型のデータを値とする辞書に変換する
    people.map((p) => [p.slug, p])
  ) as Record<PersonSlug, Person>;

  // viewerを取得（無ければ反応なしで返す）
  const viewer = await getOrCreateViewer();

  // topの最新評価5件に出てくる personSlug を集める
  const evalIds = latestEvaluations.map((e) => e.id);//最新の評価データのリストから評価IDのリストを作る
  const personSlugs = Array.from(new Set(latestEvaluations.map((e) => e.personSlug)))as PersonSlug[];//最新の評価データのリストから被評価者のスラッグのリストを作る（重複をなくすためにSetを使う）

  // viewerがいない場合は false でVM化
  if (!viewer) {//viewerオブジェクトが取得できなかった場合（Cookieが無効など）、評価カードVMのリストを作るための処理を行う
    const emptyLiked = new Set<EvaluationContentId>();//「いいね」評価IDの集合は空にする（全ての評価が「いいね」されていない状態になる）
    const emptyFav = new Set<PersonSlug>();//「お気に入り」人物スラッグの集合は空にする（全ての人物が「お気に入り」にされていない状態になる）
  return latestEvaluations.map((evaluation) => {
  const key = evaluation.personSlug as PersonSlug;
  const subject = peopleBySlug[key] ?? createUnknownPerson(key);

  return toEvaluationCardVM({
    evaluation,
    subject,
    likedEvaluationIds: emptyLiked,
    favoritedPersonSlugs: emptyFav,
  });
});

  }

  // viewerがいる場合はDBから反応を取る
  const { likedEvaluationIds, favoritedPersonSlugs } = await getViewerReactionSets({//DBからviewerIDを使って「いいね」と「お気に入り」状態を一気に取る関数を呼び出す
    viewerId: viewer.id,
    evaluationIds: evalIds,
    personSlugs,
  });

return latestEvaluations.map((evaluation) => {
  const key = evaluation.personSlug as PersonSlug;
  const subject = peopleBySlug[key] ?? createUnknownPerson(key);

  return toEvaluationCardVM({
    evaluation,
    subject,
    likedEvaluationIds,
    favoritedPersonSlugs,
  });
});

}
