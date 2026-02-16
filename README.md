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

1. microCMS で人物（people）/ 評価（evaluations）を作成・編集・削除(peopleのslugは英小文字・数字・ハイフン)
2. microCMS の Webhook が `POST /api/revalidate` を呼び出す
3. Next.js 側で `revalidateTag` / `revalidatePath` を実行して、トップページ・個人ページのキャッシュを再検証
4. 次回アクセス時に最新データへ更新される

※ ローカル（http://localhost:3000）は Webhook が届かないため、自動反映はされません（本番での反映を確認してください）。

##　　webhookデバッグチェック（受信側）
目的　microCMS から飛んでくるWebhookの中身を、Nextの /api/revalidate が“想定どおり解釈できてるか”を確認する（例　Nextがその評価が「どの人物（person）」に紐づいてるかを取得しその人物の slug を抜き出す）（成功例　newPersonSlug: "matsumoto-hitoshi"newRef: { slug: "matsumoto-hitoshi" }receivedTopKeys, rawNewKeys など）。なお、画像更新チェックは別で確認すること。
方法　① webhookのURLの最後に一時的に&debug=1を追加する（https://evaluation-room.vercel.app/api/revalidate?secret=XXXXX&debug=1）。
　　　②　ターミナルでmicroCMSで松本人志の評価を変更したことを命令する（例　 curl -s -X POST \
  "https://evaluation-room.vercel.app/api/revalidate?secret=・・・&debug=1" \
  -H "content-type: application/json" \
  -d '{"api":"evaluations","type":"edit","contents":{"新規":{"publishValue":{"人":{"slug":"matsumoto-hitoshi"}}}}}' | cat）
  　　③ ターミナルのデバッグを含んだレスポンスが返ってくればOK。（例　{"revalidated":true,"api":"evaluations","type":"edit","contentId":null,"tags":["evaluations","evaluations:latest","evaluations:matsumoto-hitoshi"],"paths":["/","/person/matsumoto-hitoshi"],"debug":{"receivedTopKeys":["新規"],"rawOldKeys":null,"rawNewKeys":["publishValue"],"newPersonSlug":"matsumoto-hitoshi","newRef":{"slug":"matsumoto-hitoshi"},"oldRef":null}）

## ヘルスチェック（DB整合性チェック）

本プロジェクトでは、microCMS のデータ整合性（参照切れなど）を確認するためのヘルスチェックAPIを用意しています。

- エンドポイント: `/api/health`
- 目的:
  - 評価（evaluations）が参照している人物（people）が存在するか（slug / 参照切れチェック）
  - people の slugに重複がないか
  - people の slug のフォーマット通りになっているか（英小文字・数字・ハイフンのみ使用可能）
- 検証方法：https://evaluation-room.vercel.app/api/health/integrity?secret=・・・
　- にブラウザでアクセスすると画面に文字（JSON）が返ってくる


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

## 失敗ログはこちら
EVELUATIONROOM/docs/troubleshooting.md


## 日々の気づきとメモ (Development Log)
2026/01/23
⚫︎Vercelのプロダクションブランチが異なるブランチにGitプッシュした場合、Vercelはデプロイされない
⚫︎Vscodeの画面左下のステータスバーのブランチを変えるとコードの内容も変わる。
⚫︎github上のあるブランチの履歴を変えたらVScodeのステータスバーをそのブランチに変えるとGithubの履歴変更が反映される。つまり作業ディレクトリ内のファイルすべてを、そのブランチの最新の状態に物理的に置き換えることができる。GithubとVscodeは繋がっている。
⚫︎サーバーについて
⭐️ローカル環境 (http://localhost:3000/)では、VSCodeでコードをいじると即反映してくれる。開発者のPC内でしかアクセスできない。
　⭐️本番環境 (https://evaluation-room.vercel.app)では、コードの変更をGitpushしてVercelがサーバー上で新しいサイトをデプロイし終わると、変更が反映される。なお、不特定多数のユーザーがアクセスできる公開されたウェブサイトのURLでもある。
　⭐️WebhookのURL（https://evaluation-room.vercel.app/api/revalidate?secret=REVALIDATE_SECRET）は、つまりmicroCMSとVercelを繋ぐ「秘密の電話番号」。microCMSでコンテンツを更新し保存すると、microCMSは登録されたWebhook URL（秘密の電話番号）にアクセスする。Vercelは「この電話番号にアクセスがあった（合図が来た）ぞ！しかも秘密の鍵も正しい！」と判断し、キャッシュの削除（再バリデーション）を実行します。なお、新しい情報の表示についてはユーザーがアクセスする際に、VercelがmicroCMSに取りに行き表示する。なお、ブラウザでこのURLを開いて繋がっていればok,trueと書いてあるというコードをrevalidate/route.tsのGET関数で書いている。
　⭐️ヘルスチェックエンドポンド（ローカル：http://localhost:3000/api/health/integrity?secret=REVALIDATE_SECRET　本番環境：https://evaluation-room.vercel.app/api/health/integrity?secret=REVALIDATE_SECRET）は,サーバーの健全性（ヘルスチェック）の確認（  「（evaluations）が参照している人物（people）が存在するか（slug / 参照切れチェック）」「people の slugに重複がないか」「people の slug のフォーマット通りになっているか（英小文字・数字・ハイフンのみ使用可能））」を流す前にVercelがこのURLにアクセスして最終確認を行う。ローカルは開発中のテスト用で開発者のPC内でしかアクセスできない。本番環境は、公開後の運用監視用。
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
② SDK導入　microCMSにて情報変更後にサイトにアクセスした際にVSCodeが新しい情報をmicroCMSにとりに行く時に必要な認証情報を定義し（サービスドメインとAPIキー）、VercelからmicroCMSへの専用の注文用紙を作成すること。具体的には、microcms-js-sdkをインストールしlib/microcms.tsと.env.localを作成する。※.env.localをGithubに上げないように.gitignoreファイルに.env* と記述すること。
③ 型（types）をCMS仕様に揃える。
④ libを「microCMS版」に置き換える。libの中で評価や人物情報をとりに行く先が.mdからmicroCMSに変える。
⑤ microCMSの更新を反映させる方法を２つ設定する（時間ベースの自動再検証（ISR）と手動再検証）
※流れとしては、microCMSで公開/更新→webhookでNext.jsに通知→Next.js側でrevalidateTag（タグを削除）/revalidatePath（パスの削除）を叩いてキャッシュを捨てて最新データを表示する。この設定を以下で行う
❺-1 環境変数(webhook用の秘密の鍵：REVALIDATE_SECRET=...　※microCMSからVercelへの命令）を.env.localに追加。※.env.localをGithubに上げないように.gitignoreファイルに.env* と記述すること。
❺-2 Vercelにプロジェクトを作成しGitリポジトリをインポートする。プロジェクト内で環境変数の設定を行う。環境ブランチ設定をメインにする。
❺-3 Route Handler（キャッシュ更新用窓口：microCMSのWebhookを受け取って、特定のキャッシュを消す機能。app/api/revalidate/route.tsのファイルをVSCodeで作成。revalidateTag/revalidatePathを返す版実装にする。webhook受信ログを追加で書く（&debug=1））を作成するのと、データ取得(evaluation/people)にrevalidateTagをつける：lib/getPersonなどのlib関数のコードにキャッシュ機能を追加でつけるのを行う（import { unstable_cache } from "next/cache"やexport const getPeople = unstable_cache...など）（unstable_cache につけるタグ名と、Route Handlerで revalidateTag する名前が1文字でも違うと動かないので完全に一致させること）
❺-4 Github（Vercel連携済み）に❺-3をプッシュしVercelに自動ビルド。
❺-5 microCMS側のWebhook設定　microCMS管理画面→コンテンツ選択→API設定→webhook→追加→サービスを選択する（カスタムを選択）→Webhook URLを設定（公開用URL（ドメイン）https://evaluation-room.vercel.app/にRoute Handlerのパスapi/revalidate?secret=・・・をつけたもの）→通知タイミングの設定に全てチェック→設定を押す→コンテンツが複数ある場合は、全て設定する
❺-6 手動再検証の動作確認：microCMSで公開/更新→本番環境（https://evaluation-room.vercel.app）で内容が変われば成功→Vercelのキャッシュ削除の方のログ（ビルドログではない）を見て200が出てれば成功
※route.tsについて
❺-7 route.ts が、URL（slug）を正しく受け取ってキャッシュを消せるかの確認と新しいページの作成（再生成）の確認（webhook受信ログ（&debug=1）をroute.tsに書いてる前提）
⚫︎受信側のチェックの場合：webhookのURLに&debug=1を付け加える→ターミナルでcurl -X POSTする（「お掃除命令」）→ターミナルで返ってきたdebug詳細を読む{"revalidated": true, "debug": {...}} →本番環境を開く（https://evaluation-room.vercel.app）→反映を確認→Vercelの管理画面（Logs）で新しいページを作ったログを確認。
⚫︎送信側のチェックの場合：microCMSを更新する→Webhook.site経由で送信ログを見る。
タグ（Tag）ベースの再検証: 特定のグループ（例：people）だけ新しいグループ情報をとりに行く（スラッグをつけてピンポイント更新も行える）。主にトップページの更新（人物一覧の更新）の際に必要。
⚫︎ブラウザのチェックの場合：本番環境（https://evaluation-room.vercel.app）を開く→Mac: ⌥ Option + ⌘ Command + I　→　Console：JavaScriptエラー、ログが書かれており、Network：API通信（/api/...）のリクエスト/レスポンスが書かれている
パス（Path）ベースの再検証: 特定のURL（例：/person/suzuki）を新しく作り直す。主に個人ページの生成に必要。


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
2026/01/30
⚫︎queriesとordersの違い
①queries (クエリ全体)：APIに対する「注文書」のようなもの
②orders (並べ替え命令)：クエリの中の一項目
2026/02/03
⚫︎オブジェクトとは「名前（キー）と値がセットになったデータの塊」のこと。例）name:田中　age:25
⚫︎リクエストボディとは、microCMSで編集した記事の「本文」「タイトル」「画像URL」など、大量で複雑なデータを詰め込む場所
⚫︎POST関数とは、サーバーに対して「新しいデータの作成・保存」や「情報の送信」を要求されたときに実行される専用の処理のこと
⚫︎revalidateする＝古くなったキャッシュを最新の状態に更新し直すこと
⚫︎newNode/oldNode：更新前のデータ/更新後のデータ
2026/02/07
POSTとGETの違い
⚫︎POST：サーバーがデータをやり取りする際にデータの送信や登録に向いており、詳細なデータ（JSONなど）を送信したり（データ量に制限がないためリクエストボディに大量のJSONデータを格納して送ることができる）、セキュリティ面で安全なものを送信する際に使う（URLには表示されない）。簡単にいうと「中身を盗み見られたくない！」「サーバーのデータを書き換えたい！」という時に使う。
※POSTの確認の仕方：①microCMSから実際に編集して飛ばして、webhook.siteを経由して “届いたJSON” を見る（送信側のデータチェック）②&debug=1設定後にcurlで疑似Webhookをターミナルで投げて、ターミナルの表示を見る（受信側のデータチェック）③Vercel Logs で POST を見る（受信側のデータチェック）
⚫︎GET：データの取得に向いており、	データがURLに表示されるため、誰でも見れることからURLをコピーして他人に送ったり、ブックマークに保存したりする際に使える。また、サーバー（CDNなど）に内容をキャッシュ（一時保存）させる際にも使う。簡単にいうと「このページを誰かに教えたい！」「何度も素早く表示したい！」という時に使う。
※GETの確認の仕方：本番環境（https://evaluation-room.vercel.app/api/revalidate?secret=・・・）をブラウザで開いて、"ok": true,が出たら生存確認（例：インターホンがつながった）
2026/02/09
⚫︎バリテーション：入力されたデータが正しい形式かどうかをチェックすること
⚫︎ORM（Prisma等）：SQLという専用の呪文を覚えなくても、JavaScriptの書き方だけでSupabaseを操れるようになる翻訳ツール
⚫︎Supabase（スパベース）：Webアプリ開発に必要な「バックエンド機能（サーバー側の仕組み）」をまるごと提供してくれるサービス。データの倉庫の役割。
⚫︎役割分担（①,②）
① microCMS（管理者が作るコンテンツ）：人物・評価（本文）＝編集者が管理する“静的コンテンツ”
② DB（ユーザーがうむコンテンツ）：ユーザーが生む“動的データ”例）お気に入り、いいね、閲覧数、コメント（任意）、通報（任意）
⚫︎prisma/schema.prismaは、Prismaを使ってJavaScript/TypeScriptでプログラムを書くための道具（Client）を自動で作ってねという命令のためのファイル。例えると家の設計図。
⚫︎prisma/migrationsは、Prismaが裏側で自動的に**「SQL（データベース専用の難しい言語）」**に翻訳して保存してくれているファイル。これが「prisma/schema.prismaのコードをいつ、どんな変更をしたか」の履歴になる。例えると家の増築・改築の記録
2026/02/10
⚫︎lib/db.ts：prismaを使ってsupabaseとVSCodeで書いたファイルを繋げる電話線になるファイル（データベース専用の電話回線を、1本だけに絞って使うためのルールが書かれている）
目的：Next.js（特に開発中）は、.ts や .tsx ファイルのコードを書き換えるたびにアプリを何度も再起動する。その際、普通に new PrismaClient() と書くと、再起動のたびに新しい電話回線（接続）を増やしてしまう。なので、すでに回線がつながっているなら、新しいのは作らずに今あるものを使えという命令がこのファイルの中身。
⚫︎まとめ：Supabase（スパベース）の設計図（migrations）は本来SQLで書く必要があって、それをJavaScript/TypeScriptから翻訳するのがprismaの役目で、それを命令している＋JavaScript/TypeScript版の設計図がprisma/schema.prisma。
⚫︎db pull（逆翻訳）：データベースであるSupabaseを見て、設計図（prisma/schema.prisma）を上書きする機能。目的としては、データベースを直接いじった時のためやチーム開発などで他人が変えた内容を自分のPCに取り込むためなどがある。なお、基本的には、schema.prisma を書き換えてから migrate dev（自分 → DB）をする一方通行。もし消えてしまったら、書き直すかGitなどの履歴から戻す必要がある。
⚫︎schema.prismaの@unique（シングルアット）：重複を禁止する場合に使う
⚫︎クッキー：データの保存場所（入れ物）　deviceId（端末ID）：その中身（データ）
⚫︎app/actions/toggleLike.ts：「いいねボタン」を押したときにデータベースを書き換える処理（Server Action） 
⚫︎ディレクティブ：プログラムに対して出す『特殊な指示』
⚫︎サーバー：本番環境 (https://evaluation-room.vercel.app)、ローカル環境 (http://localhost:3000/)などプログラムを実行するコンピュータのこと。なお、VSCodeは、そのサーバーで動かすための「命令書（コード）」を書くための道具。
⚫︎コンポーネント：見た目（UI）の部品　プロパティ（Props）：色や形を変えるための指示書
⚫︎components/evaluation/LikeButton.tsx：いいねボタン部品の作成ファイル
⚫︎.map(): JavaScriptの配列（Array）が持っている機能で、「リストの中身を1つずつ取り出して、別の形に変換して新しいリストを作る」という命令。
⚫︎オレンジ色の波線: エラー（動かない）ではないけれど、「使っていないコードがあるから整理したほうがいいよ」というVSCodeからのアドバイス
⚫︎prismaを使ってSupabase（スパベース）の設計図を書く手順
①初期準備：環境変数の設定を行う（ターミナル操作の前に、Supabaseのプロジェクト設定から取得した接続URL（DATABASE_URL）を .env ファイルに設定しておくのとVercelに設定しておく）。プロジェクトでPrismaを使えるようにするため、ターミナルで初期化コマンドを打つ（npx prisma init）。これにより prisma/schema.prisma という設計図のファイルが自動生成される。
②VSCodeで設計図を書く：schema.prisma を開いて、テーブル（モデル）の定義を書き込む。この間、ターミナルで何かを起動（常駐）させておく必要はない。
③設計図をSupabaseに反映させる：書き終えた設計図の内容を、実際のSupabaseのデータベースに反映させるためにターミナルを使う。開発中の反映：npx prisma db push　履歴を残す場合：npx prisma migrate dev --name init
④VSCodeに新しい項目を教えてあげて、prismaClient（電話回線）を最新にする：npx prisma generate
⚫︎prismaClient（電話回線）について：Prisma Clientは、VSCodeとSupabaseを繋ぎ、言葉を翻訳してデータを運ぶ「電話回線」。設計図 (schema.prisma)があった場合、supabase（データの倉庫）が発行したDATABASE_URL（supabaseの住所）を使ってインターネット越しにSupabaseを呼び出し設計図通りに作るように指示（npx prisma migrate dev）。VSCodeに新しい項目を教えてあげて、prismaClient（電話回線）を最新にする（npx prisma generate）
2026/02/13
⚫︎supabaseにはリアルタイム機能があり、ブラウザとDBを直接つなぎ、データが変わった瞬間に画面を書き換えることができる（この場合はVercelのキャッシュや再検証という概念を通らず、ブラウザ上で直接更新を検知する）
⭐️deviceId (クッキー): ブラウザに保存されている「外向きのID」。UUID（例: 550e8400-e29b...）のような文字列。
⭐️viewerId (DBのID): Supabaseの Viewer テーブルで管理される「内向きの管理番号」。通常は数値（1, 2, 3...）やDB専用のIDです。
⚫︎オブジェクト（Object）：データ（属性）と、そのデータを操作する手続き（メソッド、処理）をひとまとめにした「物（モノ）」のこと
⚫︎いいね機能について【まとめ】
①表示について：サイトに誰か（閲覧者）がアクセスしたらまずはミドルウェアが動いてdeviceID(端末ID)があるか（なければ発行）確認する。deviceIDがある状態で個人ページにアクセスすると、PersonPage関数が起動して、URLからSlugを取り出して（誰の評価ページなのか特定できる）getPersonやgetEvaluationsByPersonでslugを引数としてmicroCMSから個人データや個人の評価データを戻り値として受け取ったり、getOrCreateViewer関数を使ってprismaからdeviceIDによって検索したviewerオブジェクト（viewerID入り）を取得し、prisma.like.findManyででviewerIDに紐づいたいいね済み評価ID（配列いり）を取得し、 new Set(userLikes.map((l) => l.evaluationId)で使いやすいように評価IDの中の配列を整理して、const evaluationsWithLikeStatus = evaluations.map((e) => (で、microCMSで取得した個人の評価データとsupabaseから取得した配列整えた版のいいね済み評価IDを合体させた上で、EvaluationTimelineの関数で最新順にいいね済み個人評価データを表示する。
②いいねを押した後について：app/actions/toggleLike.tsのtoggleLike関数によって、prismaを使ってsupabaseの書き換えが行われ、revalidatePathがPersonPageを閲覧者にはわからないように再実行（レンダリング）して表示する。ページ全体を再読み込みするのではなく、今の画面を維持したまま「いいね」のところだけが変わる。
2026/02/14
⚫︎マッパー (Mapper)：異なる形式のデータを、別の形式に対応（マッピング）させて変換する翻訳者。例えばO/Rマッパー (ORM): データベースの「テーブル」のデータを、プログラミング言語の「オブジェクト」に自動で変換する（prismaなど）。
⚫︎ラッパー (Wrapper)：既存のプログラムを外側から包み込み（ラップし）、別の新しい窓口（インターフェース）を提供する。中身（元の機能）は変えず、外側の形だけを変えて使い勝手を良くすること。
⚫︎VM：仮想マシン（Virtual Machine）
⚫︎src/domain/rules.ts：正規化・制約（kind, from, category など）
⚫︎src/viewmodels/*：表示用加工（dateLabel, UI用整形）