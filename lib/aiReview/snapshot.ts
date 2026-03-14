//AI渡す「サイトの状態データ（Snapshot）」を作るファイル
//このAIレビューはDBとmicroCMSをスナップショット（AIが理解しやすいデータ）に加工してAIに渡して情報構造（プロダクト）レビューをするためのもの。
//スナップショットからAIがレビューする
//例）評価が多い→コンテンツが豊富→UXが良い可能性
//　　カテゴリーが偏っている→コンテンツの幅が狭い→UX改善の余地あり
//　　いいねが少ない→ユーザーの共感が得られていない→評価内容や対象の見直しが必要
import { htmlToText } from "@/viewmodels/formatters";//HTMLをテキストに変換する関数。AIレビューのスナップショットを作るときに、評価の内容（contentHtml）をAIに渡す前に、HTMLタグを取り除いてテキストだけにするために使う。
import type { Person, Evaluation } from "@/domain/entities";//ドメイン側の人物と評価の型定義をインポートする。AIレビューのスナップショットを作るときに、これらの型を使って人物や評価の情報を整理してAIに渡すために使う。


export type PersonReviewSnapshot = {//特定の人物ページのAIレビューについてAIへ渡すスナップショットの型定義。AIレビューの対象が特定の人物の評価の場合に、この形式でスナップショットを作ってAIに渡す。targetTypeは"person"、targetKeyはその人物のslug、generatedAtはスナップショットが生成された日時、personにはその人物の情報、evaluationsにはその人物に対する評価のリスト、statsには評価の統計情報が含まれる。
  targetType: "person";
  targetKey: string; // personSlug
  generatedAt: string; //スナップショットが生成された日時
  person: {//人物についての情報
    slug: string;//人物ページのURLに使うスラッグ
    name: string;
    description: string;
    categoryName: string;
    categorySlug: string;//カテゴリー一覧ページのURLに使うスラッグ
  };
  evaluations: Array<{//その人物に対する評価のリストデータ。評価ID、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）が含まれる。
    id: string;
    from: string;
    date: string;
    year: number;
    kind: string;
    textPlain: string; // HTML→テキスト
  }>;
  stats: {//評価の統計情報(AIは数値把握に弱いためあえて教える)。
    evaluationCount: number;//評価の総数
    includedEvaluationCount: number;//スナップショットに含まれる評価の数（全評価の中から最新N件）
  };
};

export type TopReviewSnapshot = {//トップページのAIレビューについてAIへ渡すスナップショットの型定義。AIレビューの対象がトップページ全体の場合に、この形式でスナップショットを作ってAIに渡す。targetTypeは"top"、targetKeyはnull、generatedAtはスナップショットが生成された日時、latestEvaluationsには最新の評価のリスト、categoriesにはカテゴリーごとにグループ化された人物のリスト、statsには人物数や最新評価数などの統計情報が含まれる。
  targetType: "top";//
  targetKey: null;//トップページ全体なのでkeyはなし
  generatedAt: string;//スナップショットが生成された日時
  latestEvaluations: Array<{  //最新の評価のリストデータ。評価ID、評価された人物のslug、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）が含まれる。
    id: string;
    personSlug: string;
    from: string;
    date: string;
    year: number;
    kind: string;
    textPlain: string;
  }>;
  categories: Array<{//カテゴリーごとにグループ化された人物のリストデータ。categorySlugはカテゴリー一覧ページのURLに使うスラッグ、categoryNameはカテゴリーの名前、personCountはそのカテゴリーに属する人物の数、topPersonsはそのカテゴリーの中から特に注目すべき人物のリスト（slugとname）などが含まれる。
    categorySlug: string;
    categoryName: string;
    personCount: number;//そのカテゴリーに属する人物の数
    topPersons: Array<{ slug: string; name: string }>;//各カテゴリ内の人物を名前順で並べて先頭から数件選ぶ（後述）（slugとnameを得る）
  }>;
  stats: {
    peopleCount: number;//人物の総数
    latestEvaluationCount: number;//最新評価の数
  };
};

export type LikesReviewSnapshot = {//いいね一覧ページのAIレビューについてAIへ渡すスナップショットの型定義。AIレビューの対象がいいね一覧の場合に、この形式でスナップショットを作ってAIに渡す。targetTypeは"likes"、targetKeyはnull、generatedAtはスナップショットが生成された日時、likesにはいいねされた評価のリスト、statsにはいいね数やスナップショットに含まれる数などの統計情報が含まれる。
  targetType: "likes";
  targetKey: null;//いいね一覧なのでkeyはなし
  generatedAt: string;//スナップショットが生成された日時
  likes: Array<{//いいねされた評価のリストデータ。評価ID、評価された人物のslug、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）が含まれる。
    evaluationId: string;
    personSlug: string;
    from: string;
    date: string;
    year: number;
    kind: string;
    textPlain: string;
  }>;
  stats: { likeCount: number; includedCount: number };//likeCountはいいねの総数、includedCountはスナップショットに含まれるいいねの数（通常は最新N件）
};

export type FavoritesReviewSnapshot = {//お気に入り一覧ページのAIレビューについてAIへ渡すスナップショットの型定義。AIレビューの対象がお気に入り一覧の場合に、この形式でスナップショットを作ってAIに渡す。targetTypeは"favorites"、targetKeyはnull、generatedAtはスナップショットが生成された日時、favoritesにはお気に入りに登録された人物のリスト、statsにはお気に入り数やスナップショットに含まれる数などの統計情報が含まれる。
  targetType: "favorites";
  targetKey: null;//お気に入り一覧なのでkeyはなし
  generatedAt: string;//スナップショットが生成された日時
  favorites: Array<{
    personSlug: string;
    personName: string;
    personDescription: string;
    categoryName: string;
  }>;
  stats: { favoriteCount: number; includedCount: number };//favoriteCountはお気に入りの総数、includedCountはスナップショットに含まれるお気に入りの数（通常は最新N件）
};

export type ReviewSnapshot =//targetTypeによって4つの中からどのスナップショットの形式かが決まる。
  | PersonReviewSnapshot
  | TopReviewSnapshot
  | LikesReviewSnapshot
  | FavoritesReviewSnapshot;

  
  export function buildPersonReviewSnapshot(args: {//特定の人物ページのAIレビューのスナップショットを生成する関数。引数には、その人物の情報とその人物に対する評価のリストが含まれる。返り値は、その人物ページのAIレビューのスナップショットを表すPersonReviewSnapshot型のオブジェクト。
   //引数（args）の中身 
  person: Person;//全人物情報
  evaluations: Evaluation[];//全評価情報リスト
  takeLatest?: number; //全評価の中から最新５件
}): PersonReviewSnapshot {//PersonReviewSnapshotで定義した型を返す。
  const { person, evaluations, takeLatest = 5 } = args;//引数からperson、evaluations、takeLatestを取り出す。takeLatestは最新の評価をいくつスナップショットに含めるかのオプションで、デフォルトは5件。

  const latest = [...evaluations]//全評価のリスト（特定人物の評価ではなく全体の評価）をコピーして、最新の評価から順に並べ替える。
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())//評価の日付を比較して、新しいものが前に来るようにソートする。
    .slice(0, takeLatest);//ソートされた全評価のリストから、最新の5件だけを取り出す。これがスナップショットに含める評価のリストになる。

  return {
    targetType: "person",
    targetKey: person.slug,
    generatedAt: new Date().toISOString(),//スナップショットが生成された日時をISO形式の文字列で表す。これをAIに渡すことで、スナップショットの鮮度をAIが判断できるようになる。
    person: {
      slug: person.slug,
      name: person.name,
      description: person.description ?? "",
      categoryName: person.category.name,
      categorySlug: person.category.slug,
    },
    evaluations: latest.map((e) => ({//スナップショットに含める評価のリストを、AIが理解しやすい形式に変換する。評価ID、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）を含むオブジェクトのリストに変換する。
      id: e.id,
      from: e.from,
      date: e.date,
      year: e.year,
      kind: e.kind,
      textPlain: htmlToText(e.contentHtml),//評価内容のHTMLをテキストに変換する。AIはHTMLタグを理解できないため、評価内容をテキストだけにしてスナップショットに含める。
    })),
    stats: {
      evaluationCount: evaluations.length,//その人物に対する評価の総数をスナップショットに含める。AIは数値把握が苦手なため、あえてこの情報を与えることで、AIが評価の量を理解できるようにする。
      includedEvaluationCount: latest.length,//スナップショットに含まれる評価の数をスナップショットに含める。通常は最新5件なので、5などの数値になる。これもAIが評価の量を理解するのに役立つ。
    },
  };
}

export function buildTopReviewSnapshot(args: {//トップページ全体のAIレビューのスナップショットを生成する関数。引数には、people（全人物のリスト）、grouped（カテゴリーごとにグループ化された人物のリスト）、latestEvaluations（最新の評価のリスト）などが含まれます。返り値は、トップページ全体のAIレビューのスナップショットを表すTopReviewSnapshot型のオブジェクトです。
   //引数（args）の中身 
  people: Person[];//全人物のリスト→人数（stats）を出すのに使う
  grouped: Record<string, Person[]>; // groupPeopleByCategory：カテゴリー別に分けた人物リスト
  latestEvaluations: Evaluation[];//全評価の中の最新の評価5件のリストデータ（評価ID、評価された人物のslug、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）を含む）
  takeLatest?: number;//全評価の中から最新の評価をいくつスナップショットに含めるか。デフォルトは5件。（省略可能）
  takeTopPersonsPerCategory?: number;//カテゴリーごとに何人入れるか（各カテゴリ内の人物を名前順で並べて先頭から3件選ぶ）（slugとnameを得る）
//デフォルト値を決める
}): TopReviewSnapshot {
  const {
    people,
    grouped,
    latestEvaluations,
    takeLatest = 5,
    takeTopPersonsPerCategory = 3,
  } = args;

  //最新評価を上位５件（デフォルト値）だけに絞る
  const latest = latestEvaluations.slice(0, takeLatest);//最新の評価のリストから、最新の5件だけを取り出す。これがスナップショットに含める最新評価のリストになる。
  
  //カテゴリーごとにグループ化されたリストから、各カテゴリーの人物の中から名前順に並べ替えて先頭３件を選ぶ（slugとnameを得る）
  const categories = Object.entries(grouped).map(([categoryName, persons]) => {//grouped（カテゴリーごとにグループ化された人物のリスト）を、カテゴリーごとの情報を含むオブジェクトのリストに変換する。categoryNameはカテゴリーの名前、personsはそのカテゴリーに属する人物のリスト。
    const categorySlug = persons[0]?.category?.slug ?? "uncategorized";//カテゴリーのスラッグを、格カテゴリーに属する最初の人物のカテゴリー情報から取得する。もしその人物が存在しない（personsが空）か、カテゴリー情報がない場合は、"uncategorized"というデフォルトのスラッグを使う。
    const topPersons = [...persons]//カテゴリーに属する人物のリスト（Mapで並び替えたカテゴリーごとの情報を含むオブジェクトのリストの中のpersons）をコピーして、名前順で並べ替える。
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))//人物の名前を日本語の文字列として比較して、名前順でソートする。
      .slice(0, takeTopPersonsPerCategory)//名前順の人物のリストから、先頭から3件だけを取り出す。
      .map((p) => ({ slug: p.slug, name: p.name }));//カテゴリー別トップ３件の人物のリストを、personslugとpersonnameだけのオブジェクトのリストに変換する。これをスナップショットに含める。
  
  //カテゴリーごとのに以下を返す
    return {
      categorySlug,//カテゴリーのスラッグ
      categoryName,//カテゴリーの名前
      personCount: persons.length,//そのカテゴリーに属する人物の数
      topPersons,//カテゴリーの中の名前順トップ３件（slugとname）
    };
  });

  return {
    targetType: "top",
    targetKey: null,//トップページなのでkeyはなし
    generatedAt: new Date().toISOString(),//スナップショットが生成された日時をISO形式の文字列で表す。これをAIに渡すことで、スナップショットの鮮度をAIが判断できるようになる。
    latestEvaluations: latest.map((e) => ({
      id: e.id,
      personSlug: e.personSlug,
      from: e.from,
      date: e.date,
      year: e.year,
      kind: e.kind,
      textPlain: htmlToText(e.contentHtml),//HTML→テキスト。AIはHTMLタグを理解できないため、評価内容をテキストだけにしてスナップショットに含める。
    })),
    categories,//カテゴリーごとに以下を返す（上で作ったcategoriesをそのまま入れる）
    stats: {
      peopleCount: people.length,//全人物数
      latestEvaluationCount: latest.length,//最新評価数（デフォルトだと５件）
    },
  };
}

export function buildLikesReviewSnapshot(args: {//いいね一覧ページのAIレビューのスナップショットを生成する関数。引数には、評価のリストが含まれる。返り値は、いいね一覧ページのAIレビューのスナップショットを表すLikesReviewSnapshot型のオブジェクトです。
  //引数（args）の中身 
  evaluations: Evaluation[];//いいねされた評価のリストデータ（Evaluation型：評価ID、評価された人物のslug、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）を含む）
  takeLatest?: number;//何件まで入れるか（デフォルトは10件）
}): LikesReviewSnapshot {
  //デフォルト値を決める
  const { evaluations, takeLatest = 10 } = args;

  const latest = [...evaluations]//いいねされた評価のリストをコピー。
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())//最新のいいねから順に並べ替える。
    .slice(0, takeLatest);//最新いいね順のリストから、最新の10件だけを取り出す。これがスナップショットに含めるいいねのリストになる。

  return {
    targetType: "likes",
    targetKey: null,//いいね一覧なのでkeyはなし
    generatedAt: new Date().toISOString(),//スナップショットが生成された日時をISO形式の文字列で表す。これをAIに渡すことで、スナップショットの鮮度をAIが判断できるようになる。
    likes: latest.map((e) => ({//スナップショットに含めるいいねのリストを、AIが理解しやすい形式に変換する。評価ID、評価された人物のslug、評価者、評価日、評価年、評価の種類（kind）、評価内容のテキスト（HTMLタグを取り除いたもの）を含むオブジェクトのリストに変換する。
      evaluationId: e.id,
      personSlug: e.personSlug,
      from: e.from,
      date: e.date,
      year: e.year,
      kind: e.kind,
      textPlain: htmlToText(e.contentHtml),//HTML→テキスト。AIはHTMLタグを理解できないため、評価内容をテキストだけにしてスナップショットに含める。
    })),
    stats: {
      likeCount: evaluations.length,//いいねの総数。AIは数値把握が苦手なため、あえてこの情報を与えることで、AIがいいねの量を理解できるようにする。
      includedCount: latest.length,//スナップショットに含まれるいいねの数をスナップショットに含める。(通常は最新10件なので10)
    },
  };
}

export function buildFavoritesReviewSnapshot(args: {//お気に入り一覧ページのAIレビューのスナップショットを生成する関数。引数には、お気に入りに登録された人物のリストが含まれる。返り値は、お気に入り一覧ページのAIレビューのスナップショットを表すFavoritesReviewSnapshot型のオブジェクトです。
  //引数（args）の中身
  people: Person[];//お気に入りに登録された人物のリスト（Person型の配列。slug、name、description、category.nameなどを含む）
  takeLatest?: number;//何人まで入れるか（デフォルトは20人）
}): FavoritesReviewSnapshot {
  //デフォルト値を決める
  const { people, takeLatest = 20 } = args;

  const selected = [...people]//お気に入りに登録された人物のリストをコピー
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))//名前順で並べ替える。
    .slice(0, takeLatest);//名前順のリストから、先頭から20件だけを取り出す。これがスナップショットに含めるお気に入りの人物のリストになる。

  return {
    targetType: "favorites",
    targetKey: null,
    generatedAt: new Date().toISOString(),//スナップショットが生成された日時をISO形式の文字列で表す。これをAIに渡すことで、スナップショットの鮮度をAIが判断できるようになる。
    favorites: selected.map((p) => ({//お気に入りの人物のリスト20件を、AIが理解しやすい形式に変換する。personSlug、personName、personDescription、categoryNameを含むオブジェクトのリストに変換する。
      personSlug: p.slug,
      personName: p.name,
      personDescription: p.description ?? "",//人物の説明。もしdescriptionがnullやundefinedの場合は、空文字を入れる。
      categoryName: p.category.name,//人物のカテゴリーの名前
    })),
    stats: {
      favoriteCount: people.length,//お気に入りの総数。AIは数値把握が苦手なため、あえてこの情報を与えることで、AIがお気に入りの量を理解できるようにする。
      includedCount: selected.length,//スナップショットに含むお気に入りの数を入れる(通常は先頭20件なので20)
    },
  };
}
