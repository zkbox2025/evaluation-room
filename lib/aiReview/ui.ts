//AIレビュー結果のJSONを、画面で使いやすい形に抽出するための補助ファイル

//レビュー対象を表示用の文字列にする関数(targetTypeがpersonの場合、person/targetkeyで表示する)
export function formatTargetLabel(targetType: string, targetKey?: string | null) {
  if (targetType === "person") return `person/${targetKey ?? ""}`;
  return targetType;
}
//AIレビュー結果（resultJson）から、画面で使いたい一部（summary,scores,issues先頭3件）だけ安全に抜き出す関数
export function extractReviewBits(resultJson: unknown): {//はじめにresultJsonをunknownにしておくことで安全に扱う
  //返すオブジェクトの型は以下の通り
  summary?: string;
  scores?: Record<string, number>;
  issuesTop3?: Array<{ severity: string; title: string }>;
} {
  if (!resultJson || typeof resultJson !== "object") return {};//もし resultJson が安全に読めるオブジェクトでなければ、空オブジェクトを返す

  const obj = resultJson as Record<string, unknown>;//resultJsonを「キーが文字列で値が何でもあり得るオブジェクト」として扱えるようにしてobjに入れる

  const summary =
    typeof obj.summary === "string" ? obj.summary : undefined;//obj.summaryが文字列なら取得し、そうでなければundefined

  const scores =//obj.scoresが存在していてオブジェクト型なら取得し、そうでなければundefined
    obj.scores && typeof obj.scores === "object"
      ? (obj.scores as Record<string, number>)
      : undefined;

      //obj.issuesが配列なら最初の3件を取り出して、各要素からseverityとtitleを安全に取り出し整形する。存在しないプロパティは空文字列になる
  const issuesTop3 =
    Array.isArray(obj.issues)
      ? obj.issues.slice(0, 3).map((i) => {//最初の三つを加工
          if (!i || typeof i !== "object") {//もし中身が空っぽだったり（nullなど）オブジェクトじゃなかったら、空セットを返す
            return { severity: "", title: "" };
          }
       // issuesの各要素をチェックして { severity, title } に整形
          const issue = i as Record<string, unknown>;

          return {
            severity: typeof issue.severity === "string" ? issue.severity : "",//severityがオブジェクトであればそのままでそうでなかったら空のセットを返す
            title: typeof issue.title === "string" ? issue.title : "",//titleがオブジェクトであればそのままでそうでなかったら空のセットを返す
          };
        })
      : undefined;

  return { summary, scores, issuesTop3 };
}