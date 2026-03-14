// app/reviews/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";//viewer（訪問者）を特定するための関数。deviceIDを基にviewer（訪問者）を取得するか、なければ新しく作成する関数を公開している。
import { ReviewDiffForId } from "@/components/ai/ReviewDiffForId.server";//詳細レビュー画面の「前回レビューとの差分」表示のためのコンポーネント
import { withReviewsSecret } from "@/lib/aiReview/secretLink"; // ★修正箇所はここ！

type Props = {
//引数(props)の型を定義する（params:URLからreviewidとsecretを抜き取り引数とする）
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ secret?: string }>;
};

function ScoreChips({ scores }: { scores: Record<string, number> }) {//スコアをUIに表示するためのコンポーネント。scoresは項目名をキー、スコアを値とするオブジェクト。
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(scores).map(([k, v]) => (//スコアの項目名とスコアを取り出して、UIに表示する。kが項目名、vがスコア。
        <span
          key={k}
          className="text-xs bg-gray-50 border border-gray-100 rounded-full px-2 py-1"
        >
          {k}:{v}
        </span>//スコアの項目名とスコアを「項目名:スコア」という形式で表示する。例えば「readability:4」など。
      ))}
    </div>
  );
}

export default async function ReviewDetailPage({ params, searchParams }: Props) {//レビューの詳細ページコンポーネント。URLからレビューIDを受け取って、そのレビューの詳細を表示する。
  const { id } = await params;//URLからレビューIDを受け取る。非同期で受け取るためawaitする。
   const { secret } = (await searchParams) ?? {};

  const viewer = await getOrCreateViewer();//deviceIDを基にviewer（訪問者）を取得するか、なければ新しく作成する関数を呼び出して、viewerオブジェクト（viewerID入り）を取得する。
  if (!viewer) {//viewerオブジェクトが取得できない場合（Cookieが無効などで訪問者を特定できない場合）は、エラーメッセージを表示するUIを返す。
    return (
      <main className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-2xl font-semibold">レビュー詳細</h1>
        <p className="mt-4 text-sm text-gray-600">
          Cookieが無効だと閲覧者（viewer）を特定できません。Cookieを有効にして再読み込みしてください。
        </p>
      </main>
    );
  }

  // 1件取得（viewerのものだけ見せる）
  const review = await prisma.aiReview.findFirst({//vieweridとレビューidが一致するレビューをデータベース（supabase）から探す。
    where: { id, viewerId: viewer.id },//vieweridとレビューidが一致するレビューのみ公開することで、他の人のレビューを見れないようにする（セキュリティ対策）。URLに他の人のレビューIDを入れても見れない。
  });

  const backToListHref = withReviewsSecret("/reviews", secret); // ★修正箇所はここ！

  if (!review) {//もしレビューが見つからなければ、レビューがないことを表示するUIを返す。
    return (
      <main className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-2xl font-semibold">レビュー詳細</h1>
        <p className="mt-4 text-sm text-gray-600">レビューが見つかりません。</p>
        <Link href="/reviews?secret=" className="inline-block mt-6 text-blue-600 underline">
          履歴一覧へ
        </Link>
      </main>
    );
  }

//レビューが見つかった場合は、そのレビューの詳細を表示するUIを返す。レビューの内容はreviewオブジェクトのresultJsonフィールドに入っているが、これはunknown型なので、まずは安全に必要な情報を取り出すための処理を行う。
  //reviewオブジェクトのresultJsonフィールドをrjというunknown型の変数に入れる。AIから返ってくるデータは不安定なので、まずはunknown型で受け取る。
  const rj: unknown = review.resultJson;
  const obj: Record<string, unknown> | null =
  rj && typeof rj === "object" ? (rj as Record<string, unknown>) : null;//rjがオブジェクトであればobjに入れる。そうでなければnullを入れる。これにより、objはRecord<string, unknown>型であることが保証される。

  //objからsummaryフィールドを取り出して、もしそれが文字列であればsummary変数に入れる。そうでなければnullを入れる。これにより、summaryはstring型かnullになる。
  const summary = typeof obj?.summary === "string" ? obj.summary : null;

  //objからscoresフィールドを取り出して、もしそれがオブジェクトであればscores変数に入れる。そうでなければnullを入れる。これにより、scoresはRecord<string, number>型かnullになる。ただし、ここではまだ数値になっている保証はないので、asScores関数で数値のオブジェクトに変換する必要がある。
  const scores =
  obj?.scores && typeof obj.scores === "object"
    ? (obj.scores as Record<string, number>)
    : null;

  //objからissuesフィールドを取り出して、もしそれが配列であればissues変数に入れる。そうでなければnullを入れる。これにより、issuesはunknown[]型かnullになる。asIssues関数で課題の配列に変換する必要がある。
  const issues = Array.isArray(obj?.issues) ? (obj!.issues as unknown[]) : null;

  //objからnextActionsフィールドを取り出して、もしそれが配列であればnextActions変数に入れる。そうでなければnullを入れる。これにより、nextActionsはunknown[]型かnullになる。asNextActions関数で次のアクションの配列に変換する必要がある。
  const nextActions = Array.isArray(obj?.nextActions) ? (obj!.nextActions as unknown[]) : null;

  //objからgoodPointsフィールドを取り出して、もしそれが配列であればgoodPoints変数に入れる。そうでなければnullを入れる。これにより、goodPointsはunknown[]型かnullになる。asGoodPoints関数で良い点の配列に変換する必要がある。
  const goodPoints = Array.isArray(obj?.goodPoints) ? (obj!.goodPoints as unknown[]) : null;
  //レビューの内容を安全に取り出すための処理は以上。これで、summary（文字列かnull）、scores（Record<string, number>型かnull）、issues（unknown[]型かnull）、nextActions（unknown[]型かnull）、goodPoints（unknown[]型かnull）を安全に取り出すことができた。
  
  const targetLabel =//レビューの対象をわかりやすく表示するための文字列を作る。personの場合は「person/キー」という形式で表示し、それ以外の場合はターゲットのtypeだけ表示する。
    review.targetType === "person"
      ? `person/${review.targetKey ?? ""}`
      : review.targetType;

  const backToTargetHref =
  review.targetType === "person"
    ? withReviewsSecret(`/reviews/person/${review.targetKey}`, secret)
    : withReviewsSecret(`/reviews/${review.targetType}`, secret);



  return (//ページ全体のレイアウトのリターン
    <main className="max-w-4xl mx-auto py-16 px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">レビュー詳細</h1>
          <p className="mt-2 text-sm text-gray-600">
            {new Date(review.createdAt).toLocaleString("ja-JP")} /{" "}
            <span className="font-mono">{targetLabel}</span> /{" "}
            <span className={review.status === "success" ? "text-green-700" : "text-red-700"}>
              {review.status}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            model: {review.model} / promptVersion: {review.promptVersion} / schemaVersion: {review.schemaVersion}
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <Link href={backToListHref} className="text-sm text-blue-600 underline">
            一覧へ
          </Link>
          <Link href={backToTargetHref} className="text-sm text-blue-600 underline">
            ターゲット別へ
          </Link>
        </div>
      </div>

      {/* error */}
      {review.status === "error" ? (
  <div className="mt-8 bg-white border border-gray-100 rounded-xl p-4">
    <p className="text-xs text-gray-500">errorMessage</p>
    <p className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
      {review.errorMessage ?? "不明なエラー"}
    </p>

    <p className="mt-4 text-xs text-gray-500">inputSnapshot（参考）</p>
    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto">
      {JSON.stringify(review.inputSnapshot, null, 2)}
    </pre>

    <p className="mt-4 text-xs text-gray-500">resultJson（Raw / 検証用）</p>
    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto">
      {JSON.stringify(review.resultJson, null, 2)}
    </pre>
  </div>
) : (
  <>
          {/* summary */}
          {summary && (
            <section className="mt-8 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Summary</h2>
              <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{summary}</p>
            </section>
          )}

          {/* scores */}
          {scores && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Scores</h2>
              <div className="mt-2">
                <ScoreChips scores={scores} />
              </div>
            </section>
          )}

          {/* goodPoints */}
          {goodPoints && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Good Points</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-800">
                {goodPoints.map((p: unknown, idx: number) => (
               <li key={idx}>{String(p)}</li>
            ))}
              </ul>
            </section>
          )}

          {/* issues */}
          {issues && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Issues</h2>
              <div className="mt-3 space-y-3">
                {issues.map((i: unknown, idx: number) => {
  const issue = i && typeof i === "object" ? (i as Record<string, unknown>) : null;

  return (//レビューごとにの1項目ずつを返している
    <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{String(issue?.title ?? "")}</p>
        <span className="text-xs text-gray-500">{String(issue?.severity ?? "")}</span>
      </div>
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
        {String(issue?.detail ?? "")}
      </p>
      <p className="mt-2 text-xs text-gray-600">
        <span className="font-semibold">Fix:</span> {String(issue?.fix ?? "")}
      </p>
    </div>
  );
})}
              </div>
            </section>
          )}

          {/* next actions */}
          {nextActions && (
            <section className="mt-4 bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Next Actions</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-800">
              {nextActions.map((a: unknown, idx: number) => (
              <li key={idx}>{String(a)}</li>
              ))}  
              </ul>
            </section>
          )}

          {/* raw JSON (fallback/inspection) */}
          <section className="mt-6">
            <details className="bg-white border border-gray-100 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Raw JSON（検証用）
              </summary>
              <pre className="mt-3 text-xs bg-gray-50 p-3 rounded overflow-auto">
                {JSON.stringify(review.resultJson, null, 2)}
              </pre>
            </details>
          </section>
        </>
      )}
{viewer && (
  <section className="mt-16">
    <h2 className="text-lg font-semibold mb-4">前回レビューとの差分</h2>
    <ReviewDiffForId viewerId={viewer.id} reviewId={review.id} />
  </section>
)}

    </main>
  );
}