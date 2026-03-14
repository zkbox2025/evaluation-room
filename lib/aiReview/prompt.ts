// AIに渡す注文書
import { PROMPT_VERSION, JSON_SCHEMA_VERSION } from "./versions";
import type { ReviewTarget } from "./types";//AIレビューの対象（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）を指定するためのオブジェクト
import type { ReviewSnapshot } from "./snapshot";//AIレビューのスナップショット（トップレビュー、特定の人物の評価レビュー、いいね一覧レビュー、お気に入り一覧レビュー）をまとめた関数

export function buildReviewPrompt(args: {//AIに渡す注文書を作る関数。引数は、AIレビューの対象（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）を指定するためのオブジェクトと、AIレビューのスナップショット（トップレビュー、特定の人物の評価レビュー、いいね一覧レビュー、お気に入り一覧レビュー）をまとめた関数を含むオブジェクト。
  //引数（args）の中身
  target: ReviewTarget;
  snapshot: ReviewSnapshot;
}) {
  //引数からtargetとsnapshotを取り出す
  const { target, snapshot } = args;

  //注文書の共通部分（system：AIの「キャラクター設定」と「絶対ルール」とuser：具体的な依頼内容（データ））を作る
  const system = [//system：「キャラクター設定」と「絶対ルール」は以下の通り。
    "You are a strict UX/UI reviewer for a Japanese web app.",//あなたは日本のウェブアプリの厳格なUX/UIレビュアーです。
    "Return ONLY valid JSON (no markdown, no code fences).",//有効なJSONのみを返してください（マークダウンやコードフェンスは使用しないでください）。
    `The JSON must include promptVersion="${PROMPT_VERSION}".`,//JSONにはpromptVersion="${PROMPT_VERSION}"を含める必要があります。
    `The JSON must match schemaVersion="${JSON_SCHEMA_VERSION}".`,//JSONはschemaVersion="${JSON_SCHEMA_VERSION}"に一致する必要があります。
    "Scores are integers 0-10.",//スコアは0から10の整数です。
    "Write Japanese text for summary/goodPoints/issues/nextActions.",//summary、goodPoints、issues、nextActionsには日本語のテキストを書いてください。
  ].join("\n");

  const user = JSON.stringify(//user（具体的な依頼内容（データ））は以下の通り。
    {
      instruction: "以下のsnapshotをレビューして、指定のJSON形式で返してください。",//AIへの指示文。snapshotをレビューして、指定のJSON形式で返すように指示している。
      meta: {//システムがAIの回答を正しく処理するための『バージョン管理ラベル』。AIへの指示（プロンプト）やAIとやり取りするデータの項目や型（スナップショットなど）を書き換えた際に、システム側が「どのバージョンの指示を使っているか」を識別できるようにするための情報。大幅な書き換えをしたときにバージョンを上げる。
        promptVersion: PROMPT_VERSION,
        schemaVersion: JSON_SCHEMA_VERSION,
      },
      target: { type: target.type, key: target.key ?? null },//レビューの対象を表すオブジェクト。typeはレビューの対象の種類（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）を表す文字列。keyはレビューの対象を特定するための追加情報（例えば、特定の人物のslugなど）。keyがない場合はnullになる。
      snapshot,//AIに渡すオブジェクト。プロンプトよりも重要な部分。
      outputFormat: {//AIに出力してほしいJSONの形式を指定するオブジェクト。これをもとにAIはどのような形式でJSONを返せばいいかを判断することができる。
        promptVersion: PROMPT_VERSION,
        schemaVersion: JSON_SCHEMA_VERSION,
        target: { type: target.type, key: target.key ?? null },
        scores: {//レビューのスコアを表すオブジェクト。5つの項目があり、それぞれ0から10の整数で評価される。
          ux: 0,//ユーザーエクスペリエンスのスコア（ユーザー体験：使いやすさ）→（説明文が充実しているか）
          ui: 0,//ユーザーインターフェースのスコア（見た目や操作感）→（カテゴリー分けが適切か、偏りはないか）
          performance: 0,//パフォーマンスのスコア（動きの速さや効率性）→（データ量が適切で、表示時に負荷がかからない構成か）
          accessibility: 0,//アクセシビリティのスコア（誰でも使えるか：高齢者や障がい者）→（説明文が丁寧で、誰にでも伝わる内容か）
          codeQuality: 0,//コード品質のスコア（コードの綺麗さや保守性、可読性）→（データ構造が整理されているか（不要なデータは混じってないか））
        },
        summary: "string",//レビューの要約。AIがレビューの内容を簡潔にまとめたテキスト。
        goodPoints: ["string"],//レビューの良い点のリスト。
        issues: [//レビューの問題点のリスト。
          {
            severity: "high|medium|low",//問題の深刻度を表す文字列。highは深刻な問題、mediumは中程度の問題、lowは軽微な問題を表す。
            title: "string",//問題のタイトル。AIが問題の内容を簡潔に表すテキスト。
            detail: "string",//問題の詳細。AIが問題の内容を詳しく説明するテキスト。
            fix: "string",//問題の修正案。AIが問題をどのように修正すればいいかを提案するテキスト。
          },
        ],
        nextActions: ["string"],//AIがレビューの結果をもとに、今後どのようなアクションを取ればいいかを提案するテキストのリスト。
      },
    },
    null,
    2
  );

  return { system, user };
}