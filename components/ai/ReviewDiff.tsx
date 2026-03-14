//前回のAIレビュー結果と今回の結果を比較して、その違いを表示するためのUIパーツ（前回レビューとの差分を表示するためのもの）
"use client";//このファイルはクライアントサイドで動くReactコンポーネントを定義していることをNext.jsに伝えるためのディレクティブ

export function ReviewDiff(props: {
  //以下このコンポーネントが受け取るprops（引数）の型定義
  scoreDeltas: Array<{ key: string; delta: number; latest: number; prev: number }>;//前回のAIレビュー結果と今回の結果のスコアの差分を表す配列。keyはスコアの項目名、deltaは今回のスコアから前回のスコアを引いた値、latestは今回のスコア、prevは前回のスコア。
  issuesDelta: number;//前回のAIレビュー結果と今回の結果の課題数の差分を表す数値。今回のissue数から前回のissue数を引いた値。
  latestIssues: number;//今回のAIレビュー結果の課題数を表す数値。
  prevIssues: number;//前回のAIレビュー結果の課題数を表す数値。
}) {
  //props(引数)からscoreDeltas、issuesDelta、latestIssues、prevIssuesを取り出す。これらは前回のAIレビュー結果と今回の結果のスコアの差分や課題数の差分を表すデータで、UIに表示するために使う。
  const { scoreDeltas, issuesDelta, latestIssues, prevIssues } = props;

  //scoreDeltasの中からdelta(今回のスコアから前回のスコアを引いた値)が0でないものだけをnonZeroという新しい配列にする。これにより、スコアの差分がある項目だけをUIに表示することができる。
  const nonZero = scoreDeltas.filter((d) => d.delta !== 0);

  return (
    <div className="mt-2 rounded-xl border border-gray-100 bg-white pt-2 pb-4 px-4">
        {/* スコアの差分表示 */}
      <div className="mt-1 text-sm text-gray-800">
        <p className="text-xs text-gray-500">scores</p>
        {nonZero.length === 0 ? (
          <p className="mt-0.5 text-sm text-gray-600">変化なし</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {/* 配列の要素を一つずつ HTML（JSX）に変換して並べる処理 */}
            {nonZero.map((d) => (
              <span
                key={d.key}
                className="text-xs rounded-full border border-gray-100 bg-gray-50 px-2 py-1"
              >
                {/* 差が０より大きいと+${d.delta} : + という文字と数字をくっつける（例：+5）。差が０より小さいと-3のように数字だけマイナス表記になる（何も表示しなくても-がつく。＋はあえてつけないとつかない）。deltaが0のものはnonZero配列に入らないので表示されない。*/}
                {d.key} {d.delta > 0 ? `+${d.delta}` : `${d.delta}`}
              </span>
            ))}
          </div>
        )}
      </div>
           {/* issuesの差分表示 */}
      <div className="mt-3 text-sm text-gray-800">
        <p className="text-xs text-gray-500">issues</p>
        <p className="mt-1">
          {prevIssues} → {latestIssues}（
          {/* 差分が＋ならプラスをつける */}
          {issuesDelta > 0 ? `+${issuesDelta}` : `${issuesDelta}`}）
        </p>
      </div>
    </div>
  );
}