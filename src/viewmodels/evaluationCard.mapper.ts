//prismaとmicroCMSからデータを取ってきて、評価カード（EvaluationCardVM）を作るための関数群（サーバー側専用）

// src/viewmodels/evaluationCard.mapper.ts
import type { Evaluation, Person, PersonSlug, EvaluationContentId, ViewerId } from "@/domain/entities";
import type { EvaluationCardVM } from "@/viewmodels/evaluationCard";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { formatDateLabel } from "@/viewmodels/formatters";
import type { PersonCMS } from "@/infrastructure/microcms/types";
import { toDomainPerson, createUnknownPerson } from "@/domain/mappers/person";



async function getViewerReactionSets(params: {//viewerIDを使って「いいね」と「お気に入り」状態を一気に取る関数
  viewerId: ViewerId;
  evaluationIds: EvaluationContentId[];
  personSlugs: PersonSlug[];
}): Promise<{ likedEvaluationIds: Set<EvaluationContentId>; favoritedPersonSlugs: Set<PersonSlug> }> {//引数としてviewerIdと評価IDのリストと人物スラッグのリストを受け取る
  const { viewerId, evaluationIds, personSlugs } = params;//呼び出し元から渡された引数からviewerIdと評価IDのリストと人物スラッグのリストを取り出す

  const [likes, favorites] = await Promise.all([//DBからviewerIdを使って、その人が「いいね」した評価IDのリストと「お気に入り」にした人物スラッグのリストを一気に取得（2回のDBアクセスを同時進行にする）
    prisma.like.findMany({//viewerIdを使って、その人が「いいね」した評価IDのリストをデータベースから取得
      where: { viewerId, evaluationId: { in: evaluationIds } }, // ←schemaに合わせる
      select: { evaluationId: true },
    }),
    prisma.favorite.findMany({//viewerIdを使って、その人がお気に入りにした人物スラッグのリストをデータベースから取得
      where: { viewerId, personSlug: { in: personSlugs } },
      select: { personSlug: true },
    }),
  ]);

  return {//DBから取得した「いいね」評価IDのリストと「お気に入り」人物スラッグのリストを、それぞれSetに変換して返す（Setにすることで、後で判定が高速になる）
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
  person: PersonCMS; // ← microCMS由来（category: string）
}): Promise<EvaluationCardVM[]> {
  const subject = toDomainPerson(params.person);//microCMSの人物データをPerson型（Slug付きの読みやすいデータ）に変換する関数を使って、被評価者のデータをPerson型に変換して保存

  const viewer = await getOrCreateViewer();//deviceIDを使ってviewerオブジェクト（viewerID入り）を取得し閲覧者を特定する関数を呼び出す（なければ新規で作る）

  // viewer無しでもページを壊さない
  if (!viewer) {//viewerオブジェクトが取得できなかった場合（Cookieが無効など）、評価カードVMのリストを作るための処理を行う
    const emptyLiked = new Set<EvaluationContentId>();
    const emptyFav = new Set<PersonSlug>();
    return params.evaluations.map((evaluation) =>//評価データのリストを1つずつ取り出して評価カードVMに変換する（この場合、viewerがいないので「いいね」と「お気に入り」は全てfalseになる）
      toEvaluationCardVM({ evaluation, subject, likedEvaluationIds: emptyLiked, favoritedPersonSlugs: emptyFav })
    );
  }

  const evalIds = params.evaluations.map((e) => e.id);//DBから取得した評価データのリストから評価IDのリストを作る
  const { likedEvaluationIds, favoritedPersonSlugs } = await getViewerReactionSets({//DBからviewerの「いいね」と「お気に入り」状態を一気に取る関数を呼び出す
    viewerId: viewer.id,
    evaluationIds: evalIds,
    personSlugs: [subject.slug],
  });

  return params.evaluations.map((evaluation) =>//評価データのリストを1つずつ取り出して評価カードVMに変換する
    toEvaluationCardVM({ evaluation, subject, likedEvaluationIds, favoritedPersonSlugs })
  );
}


// 追加：トップページ用
export async function buildEvaluationCardVMsForTopPage(params: {//トップページ用に評価カードVMのリストを作るための関数
  latestEvaluations: Evaluation[];
  people: PersonCMS[]; // ← getPeople() が返す形（category:string）
}): Promise<EvaluationCardVM[]> {//引数として最新の評価データのリストと人物データのリストを受け取る（人物データはmicroCMS由来でカテゴリーが文字列の形）
  const { latestEvaluations, people } = params;//呼び出し元から渡された引数から最新の評価データのリストと人物データのリストを取り出す

  // peopleのリスト（配列）をslugだけで詳細がわかるPerson(domain) の辞書（オブジェクト）にする関数を使って、URL用のスラッグをキー、Person型のデータを値とする辞書に変換して保存（評価データの被評価者のスラッグから人物データを簡単に参照できるようにするため）
  const peopleBySlug: Record<PersonSlug, Person> = Object.fromEntries(//peopleのリストを、URL用のスラッグをキー、Person型のデータを値とする辞書に変換する
    people.map((p) => {//人物データのリストを1つずつ取り出して処理する
      const domainPerson = toDomainPerson(p);//microCMSの人物データをPerson型（Slug付きの読みやすいデータ）に変換する関数を使って、Person型のデータに変換して保存
      return [domainPerson.slug, domainPerson];//URL用のスラッグをキー、Person型のデータを値とするペア配列を作って検索しやすくする
    })
  );

  // viewerを取得（無ければ反応なしで返す）
  const viewer = await getOrCreateViewer();

  // topの最新評価5件に出てくる personSlug を集める
  const evalIds = latestEvaluations.map((e) => e.id);//最新の評価データのリストから評価IDのリストを作る
  const personSlugs = Array.from(new Set(latestEvaluations.map((e) => e.personSlug)));//最新の評価データのリストから被評価者のスラッグのリストを作る（重複をなくすためにSetを使う）

  // viewerがいない場合は false でVM化
  if (!viewer) {//viewerオブジェクトが取得できなかった場合（Cookieが無効など）、評価カードVMのリストを作るための処理を行う
    const emptyLiked = new Set<EvaluationContentId>();//「いいね」評価IDの集合は空にする（全ての評価が「いいね」されていない状態になる）
    const emptyFav = new Set<PersonSlug>();//「お気に入り」人物スラッグの集合は空にする（全ての人物が「お気に入り」にされていない状態になる）
  return latestEvaluations.map((evaluation) => {
  const subject =
    peopleBySlug[evaluation.personSlug] ??
    createUnknownPerson(evaluation.personSlug);

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
  const subject =
    peopleBySlug[evaluation.personSlug] ??
    createUnknownPerson(evaluation.personSlug);

  return toEvaluationCardVM({
    evaluation,
    subject,
    likedEvaluationIds,
    favoritedPersonSlugs,
  });
});

}
