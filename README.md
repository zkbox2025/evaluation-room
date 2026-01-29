# 評価の部屋
（Evaluation Room）

著名人に対するポジティブな評価を保存・閲覧するための Webサイトです。 

## 使用技術

*   Next.js (App Router)
*   TypeScript
*   Tailwind CSS
*   Git / GitHub
*   Markdown CMS（Front Matter でデータ管理）
*   microCMS / Webhook / ISR(revalidateTag/path) / Nextキャッシュ更新

## 更新フロー（microCMS → 本番反映）

本番サイト（Vercel）は Next.js のキャッシュを利用しており、microCMS 側の更新は Webhook 経由で自動反映されます。

1. microCMS で人物（people）/ 評価（evaluations）を作成・編集・削除
2. microCMS の Webhook が `POST /api/revalidate` を呼び出す
3. Next.js 側で `revalidateTag` / `revalidatePath` を実行して、トップページ・個人ページのキャッシュを再検証
4. 次回アクセス時に最新データへ更新される

※ ローカル（http://localhost:3000）は Webhook が届かないため、自動反映はされません（本番での反映を確認してください）。

##　　webhookデバッグチェック
目的　microCMS から飛んでくるWebhookの中身を、Nextの /api/revalidate が“想定どおり解釈できてるか”を確認する（例　Nextがその評価が「どの人物（person）」に紐づいてるかを取得しその人物の slug を抜き出す）（成功例　newPersonSlug: "matsumoto-hitoshi"newRef: { slug: "matsumoto-hitoshi" }receivedTopKeys, rawNewKeys など）。なお、画像更新チェックは別で確認すること。
方法　① webhookのURLの最後に一時的に&debug=1を追加する（https://evaluation-room.vercel.app/api/revalidate?secret=XXXXX&debug=1）。
　　　②　ターミナルでmicroCMSで松本人志の評価を変更したことを命令する（例　 curl -s -X POST \
  "https://evaluation-room.vercel.app/api/revalidate?secret=KazuKazu00441144&debug=1" \
  -H "content-type: application/json" \
  -d '{"api":"evaluations","type":"edit","contents":{"新規":{"publishValue":{"人":{"slug":"matsumoto-hitoshi"}}}}}' | cat）
  　　③ ターミナルのデバッグを含んだレスポンスが返ってくればOK。（例　{"revalidated":true,"api":"evaluations","type":"edit","contentId":null,"tags":["evaluations","evaluations:latest","evaluations:matsumoto-hitoshi"],"paths":["/","/person/matsumoto-hitoshi"],"debug":{"receivedTopKeys":["新規"],"rawOldKeys":null,"rawNewKeys":["publishValue"],"newPersonSlug":"matsumoto-hitoshi","newRef":{"slug":"matsumoto-hitoshi"},"oldRef":null}）

## ヘルスチェック（DB整合性チェック）

本プロジェクトでは、microCMS のデータ整合性（参照切れなど）を確認するためのヘルスチェックAPIを用意しています。

- エンドポイント: `/api/health`
- 目的:
  - 評価（evaluations）が参照している人物（people）が存在するか（slug / 参照切れチェック）
  - 想定外のデータ構造（必須フィールド欠損など）の検知


## セットアップ手順
*   MICROCMS_SERVICE_DOMAIN
*   MICROCMS_API_KEY
*   REVALIDATE_SECRET


## 起動方法
```bash
npm install
npm run dev

## スクリーンショット

![評価の部屋 トップページ](docs/images/top-page.png)

## 開発目的

このWebサイトは、ポジティブな評価だけを集めたものになります。昨今、ネットでは他者への心無いコメントに溢れています。そんな中でも、他者を尊重したり敬意を表すような言葉で溢れた天国のような世界があればと思い、作成しております。

また、このサイトはさまざまな世代がふらっと見に来て、少し心が軽くなり、ふらっと去るような気軽さと癒しを提供できるようなサイトにしたいと考えております。

本サイトでは、

- 評価を一覧で眺められること
- 1つ1つの言葉に向き合えること
- シンプルで静かなデザインであること

を大切にしています。

## 公開URL
[Vercelで公開中](https://evaluation-room.vercel.app)

## ディレクトリ構成（抜粋）

app/
├─ page.tsx                   # トップページ
├─ person/[slug]/page.tsx     # 人物ページ

contents/
├─ evaluations/
|  ├─inoue-naoya 
|   　├─mike-tyson.md          # 評価（1件）
|　 　
├─ people/
   ├─inoue-naoya
      ├─index.md              # 人物プロフィール

lib/
├─ getEvaluationsByPersons.ts  # 人物ページ：評価一覧取得
├─ getLatestEvaluation.ts      # トップページ：最新評価取得
├─ getPerson.ts                # 人物取得/一覧取得/categoryでグループ化

utils/
├─ groupEvaluationsByYear.ts  # 評価を年ごとにグループ化

components/evaluation/
├─EvaluationCard.tsx           # 評価カード（１件）
├─EvaluationList.tsx           # 評価カードのリスト
├─EvaluationTimeline.tsx       # 年ごとのグルーピング表示


## Markdown（評価データ）について

本プロジェクトでは、評価データを Markdown ファイルとして管理しています。

### Front Matter ルール

各評価ファイル（`.md`）の先頭には以下の Front Matter を記述します。

```yaml
---
from: "評価者"
date: "YYYY-MM-DD"
year: 2026
type: "quote"
---

## Slug ルール

- Markdown ファイル名 = slug
- 英小文字 + 数字 + ハイフンのみ使用
- ドット（.）、日本語、スペースは禁止

例：
- inoue-naoya.md
- mike-tyson.md

## 日々の気づきとメモ (Development Log)
2026/01/23
⚫︎Vercelのプロダクションブランチが異なるブランチにGitプッシュした場合、Vercelはデプロイされない
⚫︎Vscodeの画面左下のステータスバーのブランチを変えるとコードの内容も変わる。
⚫︎github上のあるブランチの履歴を変えたらVScodeのステータスバーをそのブランチに変えるとGithubの履歴変更が反映される。つまり作業ディレクトリ内のファイルすべてを、そのブランチの最新の状態に物理的に置き換えることができる。GithubとVscodeは繋がっている。
⚫︎⭐️ローカル環境 (http://localhost:3000/)では、VSCodeでコードをいじると即反映してくれる。開発者のPC内でしかアクセスできない。
　⭐️本番環境 (https://evaluation-room.vercel.app)では、コードの変更をGitpushしてVercelがサーバー上で新しいサイトをデプロイし終わると、変更が反映される。なお、不特定多数のユーザーがアクセスできる公開されたウェブサイトのURLでもある。
　⭐️WebhookのURL（https://evaluation-room.vercel.app/api/revalidate?secret=REVALIDATE_SECRET）は、つまりmicroCMSとVercelを繋ぐ「秘密の電話番号」。microCMSでコンテンツを更新し保存すると、microCMSは登録されたWebhook URL（秘密の電話番号）にアクセスする。Vercelは「この電話番号にアクセスがあった（合図が来た）ぞ！しかも秘密の鍵も正しい！」と判断し、キャッシュの削除（再バリデーション）を実行します。なお、新しい情報の表示についてはユーザーがアクセスする際に、VercelがmicroCMSに取りに行き表示する。
　⭐️ヘルスチェックエンドポンド（ローカル：http://localhost:3000/api/health/integrity?secret=REVALIDATE_SECRET　本番環境：https://evaluation-room.vercel.app/api/health/integrity?secret=REVALIDATE_SECRET）は,サーバーの健全性（ヘルスチェック）の確認（「データベースに接続できるか」「必要な外部サービスと通信できるか」「重要なデータが壊れていないか（整合性）」）や新しいバージョンのデプロイ（公開）時にユーザーからのアクセス）を流す前に、VercelがこのURLにアクセスして最終確認を行うなど。ローカルは開発中のテスト用で開発者のPC内でしかアクセスできない。本番環境は、公開後の運用監視用。
　⭐️プレビューURL（https://[gitのブランチ名]-[プロジェクト名].vercel.app）は、GitHubにプッシュするたびに、Vercelが自動生成する一時的なテスト用URLで、GitHubにプッシュした後、本番にデプロイされるまで（ステージング環境/プレビュー環境）にチームメンバーや自動テストツールが最終チェックを行うもの。
⚫Next.jsはコード管理（GitHub）、データ管理（microCMS）、公開環境（Vercel）という3つの要素すべてに関与する司令塔。①フロントエンドの構築（ユーザーがブラウザで見るHTML、CSS、JavaScriptの画面を作り出す。VSCodeで書いているコードの大部分はNext.jsの記法に従っている。）②データとコードの橋渡し役（microCMS（データベース）とVercel（公開環境）の間でデータのやり取りを制御する「パイプ役」）③キャッシュの管理とWebhookの受け口（司令塔）（ユーザーアクセス時にキャッシュを高速で提供する。Webhook（合図）を受け取るためのAPIルート (/api/revalidate) を提供する。合図が来たらキャッシュを削除する（再バリデーション）機能を提供する。）

2026/01/24
⚫︎なぜローカル（開発用）と本番を分ける必要があるのか。
1.本番環境を守るため　本番だけだと開発中のバグがそのままユーザーの画面に表示され、サービスが停止したり、正しく動作しなくなったりする。
2.テストとデバッグの効率化のため 開発環境では、本番環境にはない詳細なログやテスト用機能があり、各々が余分な機能をなくした状態にできる。
まとめ. 開発環境は「実験とミスの許される作業場」であり、本番環境は「一般公開され、絶対に止めたり壊したりしてはいけないサービス提供場所」として区別されている。

2026/01/27〜
HeadlessCMSのまとめ
① microCMSでpeopleとevaluationが保存できる状態になる
② SDK導入　microCMSにて情報変更後にサイトにアクセスした際にVSCodeが新しい情報をmicroCMSにとりに行く時に必要な認証情報を定義し（サービスドメインとAPIキー）、VercelとmicroCMSを繋ぐ架け橋を作成すること。具体的には、microcms-js-sdkをインストールしlib/microcms.tsと.env.localを作成する。
③ 型（types）をCMS仕様に揃える。
④ libを「microCMS版」に置き換える。libの中で評価や人物情報をとりに行く先が.mdからmicroCMSに変える。


2026/01/28
⚫︎unstable_cache＝この関数はサーバーサイドのデータ取得結果をキャッシュして（2回目以降のアクセスを高速にして）、パフォーマンスを向上させたい際に使う。また、キャッシュの無効化（記事の更新があった際に古い記事を削除すること）・再検証（サーバーが新しいキャッシュを生成する必要があると判断した際にデータベースに新しい記事を取りにいくこと）の制御を開発者が細かく指定できる機能がある。なお、next/cacheというNext.js が提供する機能の窓口があり、その中にunstable_cacheがある。
⚫︎再検証について：サーバーが新しいキャッシュを生成する必要があると判断した際にデータベースに新しい記事を取りにいくこと。Next.jsでは、以下の２つを併用することが推奨されている。
①時間ベースの自動再検証（ISR）（＝あらかじめ設定したキャッシュの有効期限が過ぎるとキャッシュが削除され、有効期限後にもし見にきている人がいればデータベースから新しい記事を取得して表示し、新しいキャッシュとして保存する。一方で有効期限内だと、データベース上で記事の更新があったとしてもキャッシュ削除は行われずに、表示は古い記事のままだが、期限が来るまでは、裏側でデータ自体はすでに新しくなっている。なお、記事にアクセスがあった場合、新しい記事を表示するまでの間は古いキャッシュを表示する。）
※メリット　常に高速なレスポンスが保証される。
②手動再検証　（microCMSを更新するとVercelに更新情報付きのwebhook（秘密の鍵：REVALIDATE_SECRET）がいき古いキャッシュを削除する。その後、記事を見る人がアクセスした際にVercelからmicroCMSへ認証情報（サービスドメインとAPIキー）を使って新しい記事を取りに行き表示させる）
※メリット　更新した瞬間にリアルタイムで最新の情報に置き換える準備ができる
⚫︎Vscodeで//と入力した際に出てくる文字をそのまま打つにはタブキー（→｜）を押す
2026/01/29
⚫︎キャッシュキー、キャッシュタグ、スラッグについて
①キャッシュのキー：保存先の住所のようなもので保存先は主にVercelが管理する世界中のCDNサーバーのメモリ上にキャッシュが保存される。（例）["people:list"],＝microCMS取得した全員分の人物リスト（データ）を ["people:list"] という住所（キャッシュキー）で保存する。
②キャッシュのタグ：複数の関連するキャッシュデータをまとめて管理・操作するためのラベル。グループ分けや分類に使われる。もっと強力な使い方はまとめて無効化（削除）する機能。（例）{ tags: ["people"] }＝microCMS取得した全員分の人物リスト（データ）をpeopleというタグをつけて一括管理する
③スラッグ：URLの一部としてコンテンツを一意に識別したり（https://example.com/people/john-doeなど）、ヘッドレスCMSでのコンテンツ管理に役立ったり（開発者はAPI経由でmicroCMSの目的の人物に辿り着ける）、キャッシュキーやタグがスラッグによって明確なので特定のデータだけを狙い撃ちで管理できる「名札」のようなもの
⚫︎acc=累積値のこと　queries=命令のこと
⚫︎microCMSには「Markdown形式のデータ」が保存されるのでremarkでMarkdown文字列をHTMLに変換するのは必要。
⚫︎Markdown版のテキストをHTMLに変換して出力するには、原則として「remark」と「remark-html」の2つのパッケージをインストールしておくの必要がある。