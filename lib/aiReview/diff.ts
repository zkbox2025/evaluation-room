// src/lib/aiReview/diff.ts
//差分計算関数（scores増減＋issues件数差)(resultJson（レビューの結果）から取り出す)

type ReviewJson = unknown;//DBテーブルのresultJson（レビューの結果）の型定義。AIから返ってくるデータは不安定なので、まずはunknown型で受け取る。

function isRecord(v: unknown): v is Record<string, unknown> {//vがオブジェクトであるかどうかを判定する型ガード関数。vがオブジェクトであってnullでなく、配列でない場合にtrueを返す。これにより、vがRecord<string, unknown>型であることが保証される。
  return typeof v === "object" && v !== null && !Array.isArray(v);//vがオブジェクトであることを確認するために、typeof v === "object"でオブジェクトであることを確認し、v !== nullでnullでないことを確認し、!Array.isArray(v)で配列でないことを確認する。これらすべての条件が満たされるときにtrueを返す。
}

//scoresを数値に変える関数
function asScores(resultJson: ReviewJson): Record<string, number> | null {//DBテーブルのresultJson（レビューの結果）からスコアのオブジェクトを取り出して数値に変換する関数。
  if (!isRecord(resultJson)) return null;//レビューの結果がオブジェクトでなければnullを返す。

  const s = resultJson.scores;//resultJson（レビューの結果）からscoresフィールドを取り出す。scoresフィールドはスコアのオブジェクトであることが期待される。
  if (!isRecord(s)) return null;//もしscoresフィールドがオブジェクトでなければnullを返す。

  const out: Record<string, number> = {};//スコアのオブジェクトを数値に変換して入れるための空のオブジェクトを用意する。
  for (const [k, v] of Object.entries(s)) {//resultJson.scoresの各フィールド（例：ux、ui、performanceなど）について、キーをk、値をvとしてループする。
    const n = typeof v === "number" ? v : Number(v); //もしvがすでに数値ならnにそのまま入れる。そうでなければ、vをNumber関数で数値に変換してnに入れる。これにより、スコアが文字列で返ってきた場合でも数値として扱うことができる。
    if (Number.isFinite(n)) out[k] = n;//もしnが有限な数値なら、outオブジェクトのkフィールドにnを入れる。これにより、スコアが数値として有効な場合のみoutオブジェクトに入れることができる。
  }
  return Object.keys(out).length ? out : null;//outオブジェクトにフィールドが1つ以上あればoutを返す。そうでなければnullを返す。これにより、スコアが1つも有効な数値でなかった場合にはnullを返すことができる。
}

//issueの件数を数える関数
function issueCount(resultJson: ReviewJson): number {//DBテーブルのresultJson（レビューの結果）からissuesフィールドを取り出して、課題の件数を数える関数。
  if (!isRecord(resultJson)) return 0;//レビューの結果がオブジェクトでなければ0を返す。

  const issues = resultJson.issues;//resultJson（レビューの結果）からissuesフィールドを取り出す。issuesフィールドは課題の配列であることが期待される。
  return Array.isArray(issues) ? issues.length : 0;//もしissuesフィールドが配列ならその長さを返す。そうでなければ0を返す。これにより、課題の件数を数えることができる。
}

export function diffReview(latestJson: ReviewJson, prevJson: ReviewJson) {//最新レビューと前回レビューのReviewJsonの結果を入れて、スコアの差分や課題数の差分を計算する関数
  const latestScores = asScores(latestJson) ?? {};//最新レビューのスコアをasScores関数で数値のオブジェクトに変換する。もし変換できなければ空のオブジェクトにする。
  const prevScores = asScores(prevJson) ?? {};//前回レビューのスコアをasScores関数で数値のオブジェクトに変換する。もし変換できなければ空のオブジェクトにする。

  const deltas: Array<{ key: string; delta: number; latest: number; prev: number }> = [];//スコアの差分を入れるための空の配列を用意する。各要素は、スコアの項目名（key）、今回のスコアから前回のスコアを引いた値（delta）、今回のスコア（latest）、前回のスコア（prev）を持つオブジェクトになる。

  for (const key of Object.keys(latestScores)) {//最新レビューのスコアの項目名（例：ux、ui、performanceなど）についてループする。keyには項目名が入る。
    const latest = latestScores[key] ?? 0;//最新レビューのスコアの項目の値をlatestに入れる。もしその項目がなければ0にする。
    const prev = prevScores[key] ?? 0;//前回レビューのスコアの項目の値をprevに入れる。もしその項目がなければ0にする。
    deltas.push({ key, delta: latest - prev, latest, prev });//deltas配列に、項目名（key）、今回のスコアから前回のスコアを引いた値（delta）、今回のスコア（latest）、前回のスコア（prev）を持つオブジェクトを追加する。
  }

  const latestIssues = issueCount(latestJson);//最新レビューの課題数をissueCount関数で数える。
  const prevIssues = issueCount(prevJson);//前回レビューの課題数をissueCount関数で数える。

  return {
    scoreDeltas: deltas,//スコアの差分を入れたdeltas配列(項目名（key）、今回のスコアから前回のスコアを引いた値（delta）、今回のスコア（latest）、前回のスコア（prev）)をscoreDeltasフィールドに入れる。
    issuesDelta: latestIssues - prevIssues,//課題数の差分を、最新レビューの課題数から前回レビューの課題数を引いた値をissuesDeltaフィールドに入れる。
    latestIssues,//最新レビューの課題数をlatestIssuesフィールドに入れる。
    prevIssues,//前回レビューの課題数をprevIssuesフィールドに入れる。
  };
}