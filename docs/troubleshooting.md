このドキュメントは、開発・運用中に発生したトラブルの「症状→原因→切り分け→解決策→再発防止」を記録します。  
同じ問題に再度ハマらないためのメモ兼、第三者が復旧できるための手順書です。

---

## 目次
- [基本の確認フロー](#基本の確認フロー)
- [よくある問題（クイック一覧）](#よくある問題クイック一覧)
- [トラブル記録テンプレ](#トラブル記録テンプレ)
- [環境変数チェックリスト](#環境変数チェックリスト)
- [外部連携別メモ](#外部連携別メモ)
  - [microCMS](#microcms)
  - [Supabase](#supabase)
  - [Vercel](#vercel)

---

## 基本の確認フロー

問題が起きたら、まずはこの順で確認します。

1. **再現（操作→結果）できるか**
   - ローカル / 本番 / プレビューのどれで起きるか
   - 再現手順を3ステップ以内で書けるか
2. **直前に変えたもの**
   - 直近のコミット / env / microCMS設定 / Supabase設定 / Vercel設定
3. **ログを確認**
   - ブラウザ（Network / Console）
   - サーバー（Vercel Functions logs）
   - DB（Supabase logs / SQL）
4. **原因の切り分け**
   - UI（表示） / API（通信） / DB（保存） / 外部（microCMS等） のどこか
5. **暫定回避 → 恒久対応**
   - まず復旧、その後に再発防止策（チェック・テスト・制約）を入れる

---

## よくある問題（クイック一覧）

| 症状 | まず見る場所 | ありがちな原因 |
|---|---|---|
| microCMS更新しても反映されない | microCMS Webhook / Vercel logs | Webhook URL違い・署名/シークレット不一致・revalidate処理失敗 |
| 401/403になる | Vercel env / microCMS APIキー | envが未設定・キーが違う・権限不足 |
| 本番だけ動かない | Vercel env / Build logs | envの登録漏れ・`NEXT_PUBLIC_`の誤用 |
| SupabaseでInsertできない | Supabase RLS / logs | RLSポリシー・service roleの扱い・JWT |
| いいねが二重に入る | DB制約 / API | unique制約不足・二重送信対策不足 |
| Prisma migrateで落ちる | schema / migration logs | 型変更・nullable変更・既存データ不整合 |

---

## トラブル記録テンプレ

以下をコピペして追記してください。

### [YYYY-MM-DD] [短いタイトル（例：microCMS更新が反映されない）]

**影響範囲**
- 発生環境：`local / preview / production`
- 影響：`閲覧不可 / 一部機能のみ / 管理画面のみ` など
- 緊急度：`P0 / P1 / P2`

**症状**
- 何が起きたか：
- 期待していた動作：

**再現手順**
1.
2.
3.

**エラーメッセージ / ログ**
- ブラウザ：`(Console/Networkの要点)`
- サーバー：`(Vercel logsの要点)`
- DB：`(SQLエラー等)`
- ※必要ならスクショやログ断片（個人情報・キーは必ずマスク）

**切り分けメモ（どこが怪しいか）**
- UI：
- API：
- DB：
- 外部連携（microCMS / Supabase / Vercel）：

**原因（Root Cause）**
- 結論：
- 直接原因：
- 背景要因（なぜ起きた）：

**解決策（Fix）**
- 対応内容：
- 変更したファイル：  
  - `path/to/file`
- 変更した設定：  
  - microCMS：  
  - Supabase：  
  - Vercel：  
- 参考（関連Issue/PR/コミット）：`(リンク or ハッシュ)`

**確認（動作検証）**
- ローカル：
- プレビュー：
- 本番：
- 回帰（他機能への影響）：

**再発防止（Prevention）**
- [ ] 起動時envチェックを追加（不足なら明示的にエラー）
- [ ] unique制約 / バリデーション追加
- [ ] 監視（ログ出力）を追加
- [ ] README / docs更新
- [ ] テスト追加（可能なら）

---

### [2026-02-19] [カテゴリー別ページが反映されない]

**影響範囲**
- 発生環境：`local
- 影響：一部機能のみ
- 緊急度：中

**症状**
- 何が起きたか：トップページのリンクから飛べるようにカテゴリー別のページを作成したところ、リンク先には飛べるが、どのリンク先（/category/[slug] ）へ飛んでも表示が「カテゴリー」「カテゴリーの人物がいません」になる
- 期待していた動作：トップページのカテゴリー名を押すとそのカテゴリ別ページにとびカテゴリー名と属している人物名が表示される。

**再現手順**
1.トップページのカテゴリー名をカテゴリー別ページにリンクする
2.カテゴリー別ページ（app/category/[slug]/page.tsx）を作成する
3.ローカルで確認

**エラーメッセージ / ログ**
- サーバーログ：Error: Route "/category/[slug]" used params.slug. params is a Promise...
（console.logを追加してターミナルでチェック）

**切り分けメモ（どこが怪しいか）**
- 外部連携（microCMS）

**原因（Root Cause）**
- 結論
①Next.js 15以降、ページコンポーネントの params は直接アクセスできるオブジェクトではなく、Promise（非同期）に変更されたためawait paramsとしparamsをawaitするように変更したら解決
②取得した slug を decodeURIComponent(slug) でデコードし、比較用の文字列を日本語に戻したら解決
- 直接原因
①Next.jsの破壊的変更
②ブラウザから渡される日本語の slug は、内部的にURLエンコード（例：将棋 → %E5%B0%86%E6%A3%8B）されているため、 DB側の生データ（将棋）と、エンコードされた文字列（%E5...）を直接 === で比較したため、一致判定に失敗した。

**解決策（Fix）**
- 1.対応内容：params を await する
- 変更したファイル：  
  -  app/category/[slug]/page.tsx
- 変更した設定：  
(前)export default async function CategoryPage({ params }: Props) {
const categorySlug = params.slug;
(後)export default async function CategoryPage({ params }: Props) {
const { slug } = await params;

- 2.対応内容：
- 変更したファイル：  
  -  app/category/[slug]/page.tsx
- 変更した設定：  
(前)  export default async function CategoryPage({ params }: Props) {
　const { slug } = await params;
　const people = await getPeople();
  const persons = people.filter((p) => p.category?.slug === categorySlug);
  const categoryName = persons[0]?.category?.name ?? "カテゴリ";
(後)export default async function CategoryPage({ params }: Props) {
　const { slug } = await params;
  const categorySlug = decodeURIComponent(slug);←これ！
  const people = await getPeople();
  const persons = people.filter((p) => p.category?.slug === categorySlug);
}


**確認（動作検証）**
- ローカル
（古いキャッシュを消す（rm -rf .next && npm run dev）のとブラウザ側も消す（Mac: Cmd + Shift + R）てから確認するとより良い

**再発防止（Prevention）**
・・・

---

### [2026-02-25] [schema.prismaを開発用DBにマイグレーションできない（DBにテーブルが反映されない）]

**影響範囲**
- 発生環境：Prisma 7
- 緊急度：中

**症状**
- 何が起きたか：schema.prismaにAiGenerationのテーブルを追加して開発用DB側にマイグレーションしようとしたが、ターミナルでエラー表示が出て作成できない。
- 期待していた動作：開発用DB側にAiGenerationのテーブルをマイグレーション。

**再現手順**
1.schema.prismaにAiGenerationのテーブルを追加
2.「npx prisma migrate dev」をターミナルで行う
3.❶接続先のサーバー名（ホスト）が空っぽだというエラーメッセージが出た。
  ❷schema.prisma に url が書いてある限り、Prisma 7 はそれを拒否するというメッセージが出た
  ❸prisma5で実行したところprisma.config.ts の中で参照している DIRECT_URL（5432番ポート/直結用） という環境変数が、あなたの .env ファイルに定義されていないというエラーメッセージが出た。

**エラーメッセージ / ログ**
- ❶Error: P1013: The provided database string is invalid. empty host in database URL.
- ❷Error code: P1012　error: The datasource property `url` is no longer supported in schema files
- ❸Error: PrismaConfigEnvError: Cannot resolve environment variable: DIRECT_URL（5432番）.

**切り分けメモ（どこが怪しいか）**
- ❶prisma.config.tsに記載のDIRECT_URL（5432番）先とDIRECT_URLの記載
- ❷schema.prismaのファイル（datasource db {provider = "postgresql"}に余計なurlが混じってる）
- ❸環境変数の設定。

**原因（Root Cause）**
- ❶.envの他に、env.localなどのファイルがあった。それと、DIRECT_URL（5432番ポート）に不適切な文字が混ざっていた（＠://←これはよくAIの回答をコピペしたらつくことがある）
- ❷Prisma 7から このプロジェクトでは Prisma config（prisma.config.ts）で datasource を管理する設定になっており、schema.prisma の datasource.url は禁止されていた。故にprisma.config.ts での管理が必須になった。schema.prismaのファイル内にDIRECT_URL（5432番ポート/）直結用などを記載していた。
- ❸環境変数として.envとVercelにDIRECT_URL（5432番ポート/直結用）が設定されていない。

**結論**
- ❶ prisma.config.tsのdatasource: { url: env("DIRECT_URL（）"),} （←URL確認先）というコードの意味まで理解しておらず、.envという何もコードが書かれていないファイルにprismaが確認しに行っていたのがオチ。それと、DIRECT_URL（5432番ポート/直結用）に不適切な文字（＠://）が混ざっているのはAIに聞いた回答をそのままコピペする際によくあるのでDIRECT_URL（5432番ポート/直結用）のコピペには注意が必要。
- ❷2025年11月からPrisma 7になり、このプロジェクトではprisma.config.ts での管理が必須になった。AIがいまだにschema.prisma 内に url を直接書くのを進めることがあるので注意が必要。
- ❸まず、GitHub Actionsで自動適用の設定をする（GitHub に Secrets を登録＋リポジトリにworkflowのファイルを作る）と、ローカルでmigrate devしてprisma/migrationsを作る（DBに反映）して、Githubへプッシュすると、自動でnpx prisma migrate deployしてくれる（GitHubがpush をトリガーに workflow を起動して、workflow の中で npx prisma migrate deployを行い、本番DB（Supabase）が作成したprisma/migrationsにマイグレーションされる。）。この設定の方が長期的にみて楽（GitHub Actionsがネットワーク環境の影響により難しい場合がある。次の失敗ログを見ること）。
Prisma 7（最新） の config では、CLIが参照するのは datasource.url 1本。configにはdatasource: {url: env("DATABASE_URL")}と書くこと（DATABASE_URLをみに行くように）。さらに、Prisma 7では「どのURLを参照するか」を env で切り替える運用が一番現実的。

【※prisma6：旧版】
# アプリ実行用（Vercel（本番環境）などにDBをデプロイ（公開）するなど）（npx prisma migrate deploy）# マイグレーション用（更新したschema.prismaをDB（supabase）上に書き換えをお願いするとき）（npx prisma migrate dev）に必要なDIRECT_URL（5432番ポート/直結用）はDB設計には必須。


**解決策（Fix）**
- ❶AIの回答したDIRECT_URL（5432番ポート/直結用）に＠://があったので消す（末尾に:5432/postgresの入れ忘れにも注意）
- ❷schema.prisma に url は書かずにprisma.config.tsにかく。AIが勧めてきても聞き返すこと！
- ❸prisma6より前の改訂前のバージョンでやるなら環境変数として.envとVercelにDIRECT_URL（5432番ポート/直結用）を設定。ただ、GitHub Actionsで自動適用をするべき（GitHub Actionsがネットワーク環境の影響により難しい場合がある。次の失敗ログを見ること）。

**確認（動作検証）**
- 「npx prisma migrate dev」をターミナルで行い、「Your database is now in sync with your migration history」と表示される。
- SupabaseのTable Editorで テーブル が増えている

**よくある落とし穴**
⚫︎DATABASE_URLは三つある。同じ名前でも別物。
① VercelのDATABASE_URL（アプリ実行時用）に置く DATABASE_URL（＝6543（プール））と
② GitHub Actionsのsecrets（本番DBにprisma migrations（SQLファイル：履歴）を流し込む：migrate deploy実行時）に置く DATABASE_URL（＝5432（直結）難しければ6543）と
③ ローカルの .env（schema.prismaをDBに流し込んでprisma migrations（SQLファイル：その履歴）を作成する）を置く　DATABASE_URL（＝5432（ローカル））がある(Docker Desktopをインストールすること)
⚫︎読み込みの優先順位　①.env ②.env.local 
⚫︎pooler（6543）と direct（5432）を取り違える（アプリ実行はpooler（6543）で direct（5432）はmigrate を安定させるために推奨）



**再発防止（Prevention）**
⭐️prisma.config.ts の最小例
import "dotenv/config"; // これが重要！
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",//スキーマファイル（設計図）の保存場所を指定
  migrations: {
    path: "prisma/migrations",//マイグレーションファイル（prismaで翻訳した後の設計図：SQL版）の保存場所を指定
  },
  datasource: {
    url: process.env.DATABASE_URL, //.env.URLの確認先()

  },
});

⭐️.env の最小例
# マイグレーション用（更新したschema.prismaをローカルDB（DockerのPostgres）に書き換えをお願いするとき）（npx prisma migrate dev）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_dev?schema=public"


⭐️schema.prismaのdatasource dbの最小例
datasource db {
  provider = "postgresql"
}




【補足】今回、DATABASE_URL（6543:データの取得・追加・更新・削除（CRUD操作））しか設定しておらずDIRECT_URL（5432番ポート/直結用）(DBを本番環境にデプロイ（公開）したり、schema.prismaをDB（supabase）上に書き換え用)の.envとVercelの設定がされていなかったため設定した。

---


### [2026-03-01] [GitHub Actionsの Prisma migrate deploy が本番DBに適用できない（5432到達不可＋6543フリーズ/応答なし]

**影響範囲**
- 発生環境：Prisma 7 / Supabase(Postgres) / GitHub Actions / Vercel
- 緊急度：中（本番DBの自動反映が止まる）

**症状**
- 何が起きたか：GitHub Actions で npx prisma migrate deploy を本番DBへ適用しようとしたが失敗した。direct(5432) を使うと P1001: Can't reach database server になる。pooler(6543) を使うと migrate deploy が長時間くるくるして完了しない（ハングする）。
- 期待していた動作：main にマージしたら GitHub Actions が migrate deploy を実行し、本番DB（Supabase）へ migration が適用される。

**再現手順**
1.schema.prisma を更新し、ローカルDBで npx prisma migrate dev を実行して migration を作成（prisma/migrations が増える）。
2.変更を GitHub に push → main にマージ。
3.GitHub Actions の workflow で npx prisma migrate deploy が実行されるが、以下のいずれかで失敗/停止する。

**エラーメッセージ / ログ**
- direct(5432) の場合：Error: P1001: Can't reach database server at `db.lncaitryhrdnmndgaorl.supabase.co:5432`
- pooler(6543) の場合：Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-ap-south-1.pooler.supabase.com:6543まで出た後に進まず、長時間ハング
- 付随調査（ローカルから 5432接続テスト）：psql: ... port 5432 failed: Network is unreachable（IPv6アドレスへ接続しようとして失敗）具体的にはdocker run --rm -it postgres:16 psql "postgresql://postgres:・・・@db.lncaitryhrdnmndgaorl.supabase.co:5432/postgres?sslmode=require"をするとport 5432 failed: Network is unreachableになる。つまり今の環境（回線/ルータ/会社ネット/携帯テザリング/Wi-Fi設定）では IPv6が使えない、または IPv6はあるけど外へ出られない状態。

**切り分けメモ（どこが怪しいか）**
- GitHub Actions ランナーから db.lncaitryhrdnmndgaorl.supabase.co:5432 へネットワーク到達できるか（nc/psqlで確認）
- Supabase の direct host が IPv6 を優先して返し、環境によって Network is unreachable になる可能性
- pooler(6543) 経由の migrate deploy がロック/トランザクションの都合でハングする可能性
- Secrets が正しく渡っているか（user/host のデバッグで確認）

**原因（Root Cause）**
- GitHub-hosted runner から Supabase の direct(5432) へ到達できず、P1001 になった（ネットワーク到達性の問題）
- pooler(6543) は到達できるが、Prisma migrate deploy が pooler 経由でハングしやすく、CIで安定しなかった。
- ローカル環境でも direct(5432) は IPv6 経路が無く Network is unreachable になることがあり、環境依存で直結が難しかった

**結論**
- GitHub Actions（GitHub-hosted）で “direct(5432) を使った本番 migrate” は実行できない。
- 本番DB反映は当面「ローカルで migrate deploy」に切り替え、PR（メインへのマージ前の申請）のためのworkflowではshema.prismaの内容についてはDB不要のチェックのみをprisma-schema-check.ymlに基づいてgithub Actionが実行することに切り替える（prisma validate / prisma generate / lint / build）。


**解決策（Fix）**
- 本番DBへの migration 適用はローカルで実行：.env.prod に本番DB接続（当面 pooler 6543）を用意。npx dotenv-cli -e .env.prod -- npx prisma migrate deployをターミナルで手動実行。

**確認（動作検証）**
- ローカルで dotenv -e .env.prod -- npx prisma migrate deploy を実行し、No pending migrations to apply. または migration 適用ログが出ることを確認。Supabase の Table Editor または _prisma_migrations を確認し、migration が適用済みであることを確認。

**よくある落とし穴**
- pooler(6543) はアプリ接続向きだが、migrate ではハング/失敗することがある
- direct(5432) が IPv6 を優先し（docker側がIPv6が使用困難により）、回線/PCによって Network is unreachable になることがある
- GitHub Secrets の DATABASE_URL が想定と違う値（userが postgres など）になっていると P1000 になる。具体的には、supabaseのDirectやPoolerのURLに書かれているYOUR PASSWORDには、データベースパスワード（ひとつしか設定できないもの）を採用すること（ここを書き換えたらURLのYOUR PASSWORDも書き換えること）
- PR workflow に本番DB接続を入れると安全性/負荷/Secrets未注入(fork PR)で問題が起きるので削除
- -e .env.prod（本番環境マイグレーション用）にprisma migrate devしたら全てデータが消えるので注意。（prisma migrate dev は、SQL（マイグレーションファイル）を作成する過程で「データベースの中身を一度リセット（全削除）」する。Prismaが「現在のDBの状態」と「マイグレーション履歴」に少しでも矛盾（ズレ）を見つけると、「Database reset required」と表示され、そこで y を押してしまうと、Prismaは現在のテーブルをすべて削除し、最初から作り直そうとします。これで本番データは全滅するので危険。）

**再発防止（Prevention）**
- 【schema.prismaを書き換えた後の動き】
❶ ローカルでスキーマをローカルDB（DockerのPostgres）にマイグレーションしprisma.migrationsの中のSQLをローカルで作成（npx prisma migrate dev --name ・・・）
❷ githubのブランチにプッシュして、メインにPR&マージ
❸ ローカルで本番環境DB（supabase）にprisma.migrationsのSQLをマイグレーション（npx dotenv-cli -e .env.prod -- npx prisma migrate deploy）

- ローカルで本番環境DBにマイグレーションするのに、prisma.configのurlは固定しDATABASE_URLを参照させ、接続先をターミナルへのコマンドで変えるようにする。
　開発DBへのマイグレーションについては.env（ローカルDB：DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_dev?schema=public"）を使用し、
　本番環境DBへのマイグレーションについては.env.prod（本番DB：DATABASE_URL="postgresql://postgres.lncaitryhrdnmndgaorl:YOUR PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"）を使用するように、開発と本番を分離して事故を防ぐ。
- github Actionが行うPR　workflow（.github/workfrows/prisma-schema-check.yml）はDB不要のコード品質チェックのみ
- workflowに timeout-minutes を設定し、ハングしても永遠に回らないようにする



---

### [2026-03-02] [mainにPRできない（古いworkflow残存＋microCMS環境変数不足でBuild失敗）]

**影響範囲**
- 発生環境：GitHub Actions（workflow管理）/ Next.js build / microCMS / Prisma 7（副次的）
- 緊急度：中（PRのマージがブロックされ開発が止まる）

**症状**
- 何が起きたか：PRをmainに出すとworkfrow/prisma-schema-checkが失敗した。失敗原因が2つあり、①古いworkflowファイルが残っていたこと、②microCMSの環境変数がPRビルドに渡っていなかったこと。
- 期待していた動作：PR作成時にworkfrow/prisma-schema-check（validate/lint/build）が走り、成功してマージできる.

**再現手順**
1.過去に作成した .github/workflows/prisma-migrate-deploy.yml を残したまま、別のworkflowへ移行したつもりでPRを作成。
2.PRのChecksで、意図していない workflow（prisma-migrate-deploy.yml）が実行され続ける。
3.古いworkflowを削除した後、npm run build (next build) が microCMS 設定不足で失敗し、PRが再びブロックされる。

**エラーメッセージ / ログ**
- ① 古いworkflow残存による失敗（Prisma 7のCLIオプション変更に起因）：
Workflow file for this run: .github/workflows/prisma-migrate-deploy.yml
Error: --from-schema-datamodel was removed. Please use --[from/to]-schema instead.

- ② microCMS環境変数がGithubActionsのsecretsに登録されていないことによるBuild失敗：
Error: parameter is required (check serviceDomain and apiKey)
Build error occurred: Failed to collect page data for /api/health/integrity

**切り分けメモ（どこが怪しいか）**
- PRのChecks画面で「どのworkflowファイルが実行されているか」を確認
→“Workflow file for this run” が prisma-migrate-deploy.yml（古いファイル） を指していた
- Githubのブランチで.github/workflows/ 配下に古いファイルが残っていないか確認
→ prisma-migrate-deploy.yml が残存していた
- Build失敗のスタックトレースから、app/api/health/integrity がビルド時に実行され、microCMS client 初期化で落ちていることを確認（build時にenvが渡ってない）
- src/infrastructure/microcms/client.ts が process.env.MICROCMS_SERVICE_DOMAIN と process.env.MICROCMS_API_KEY を必須参照していることを確認

 

**原因（Root Cause）**
- ① 旧workflowファイルがリポジトリに残っていた
workflowは “名前” ではなく .github/workflows/*.yml の ファイル単位で認識されるため、内容を上書きしたつもりでも、古い prisma-migrate-deploy.yml が残っている限り実行され続けた。その旧workflow内で prisma migrate diff の古いオプション --from-schema-datamodel を使っており、Prisma 7で失敗した
- ② PR build環境で microCMS の環境変数が未設定
build 中に /api/health/integrity の route が評価され、microCMS client の初期化で serviceDomain/apiKey 不足によりエラーになった（PRの build は「コードを本番用にまとめる」だけじゃなく、サーバー側のルートやAPIのコードも読み込む）

**結論**
- PRのマージ失敗は「DBやmigrationそのもの」ではなく、(1) 古いworkflowファイルの残存 と (2) microCMS環境変数の不足が直接原因だった。


**解決策（Fix）**
- ① 古いworkflowの削除
.github/workflows/prisma-migrate-deploy.yml を削除し、mainに反映（PR→マージ）して残存を解消。PR用workflowは .github/workflows/prisma-schema-check.yml のみに統一するために再度、ブランチにプッシュしてメインにPR/マージした
- ② microCMS環境変数をPR buildに注入
GitHub Secrets に以下を追加：MICROCMS_SERVICE_DOMAINとMICROCMS_API_KEY（可能ならread-only）
.github/workflows/prisma-schema-check.yml の Buildステップにのみ env を渡すよう修正（validate/lintには渡さない）：env: MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY

**確認（動作検証）**
- PRのChecksで “Workflow file for this run” が prisma-schema-check.yml になっていることを確認
- prisma-schema-check が Prisma validate / Lint / Build まで全て成功することを確認
- mainへのマージがブロックされないことを確認

**よくある落とし穴**
- workflowは「表示名」ではなく .github/workflows のファイルで管理される
→ リネームしたつもりでも旧ファイルが残ると旧workflowが走り続ける
- PrismaのCLIオプションはバージョンで変更される（例：--from-schema-datamodel 廃止）
- next build 中にAPI route が評価されることがあり、環境変数が無いとビルドが落ちる
- PR用workflowで本番DBや本番用Secretsを使うと、セキュリティ/運用面で危険になりやすい

**再発防止（Prevention）**
- .github/workflows/ の不要ファイルは必ず削除し、PRのChecksで “Workflow file for this run” を確認する
- PR用workflowは DB不要に寄せ、必要な外部サービス（microCMSなど）のenvは Buildステップに限定して注入する
- microCMS APIキーは可能なら read-only にしてGitHub Secretsへ保存する
- 重要なworkflow変更は「ブランチで確認→PR checks確認→mainへ反映」の手順を固定化する


---
### [2026-03-03] [schema.prisma変更後に PrismaClient が更新されず aiGeneration が型エラーになる]

**影響範囲**
- 発生環境：ローカル開発（Next.js + TypeScript + Prisma 7）
- 緊急度：中（実行はできない/ビルドが通らない）

**症状**
- 何が起きたか：prisma.aiGeneration に赤線が付き、TypeScript が Property 'aiGeneration' does not exist on type 'PrismaClient<...>' を出した
- 期待していた動作：iGeneration モデル追加後、prisma.aiGeneration.create/findFirst/findMany が型的に利用できる

**再現手順**
1.schema.prisma に model AiGeneration { ... } を追加（またはモデル名/フィールドを変更）
2.npx prisma generate を実行しないまま、アプリ側で prisma.aiGeneration を参照するコードを書く
3.TypeScript が prisma.aiGeneration を認識せずエラーになる

**エラーメッセージ / ログ**
- aiGenerationに赤い波線が書いてありプロパティ 'aiGeneration' は型 'PrismaClient<PrismaClientOptions, never, defaultArgs>' に存在しません。という表記が出る

**切り分けメモ（どこが怪しいか）**
- Prisma のモデル追加（スキーマに追加）直後に発生
- DB接続（DATABASE_URL）や PrismaPg adapter の設定とは無関係に、VSCode の中で動いている「TypeScript/JavaScript のコードを分析する裏方のプログラム」上で即エラーになる
- npx prisma generate 実行後に解消した


**原因（Root Cause）**
- schema.prisma を変更しても、Prisma Client（@prisma/client の生成コードと .d.ts）は自動更新されない。生成済み Prisma Client が古く AiGeneration モデルの delegate（aiGeneration）を含んでいなかったため、prisma.aiGeneration が存在しない型として扱われた。

**結論**
- 「schema を変えたのに client を再生成していない」ことによる 型生成の不整合が原因



**解決策（Fix）**
- npx prisma generate を実行（必要に応じて dev サーバー再起動 / TS Server 再起動）

**確認（動作検証）**
- npx prisma generate 後に prisma.aiGeneration の赤線が消えることを確認。TypeScript のエラーが解消し、ビルド/型チェックが通ることを確認

**よくある落とし穴**
- migrate dev / migrate deploy と generate を混同する（migration はDB反映、generate は コード/型反映）
- VSCode の中で動いている「TypeScript/JavaScript のコードを分析する裏方のプログラム」が古い型を握っていて、generate 後も表示が更新されないことがある（その場合、サーバー再起動で直る：Command + Shift + P）


**再発防止（Prevention）**
- schema.prisma を触ったら必ず npx prisma generate を実行する習慣をつける


### [2026-03-06] [anyにUnexpected any. Specify a different type.と赤線で書かれてる]

**影響範囲**
- 発生環境：ローカル開発（Next.js / TypeScript / ESLint
- 緊急度：低〜中

**症状**
- 何が起きたか：any を使っている箇所に Unexpected any. Specify a different type. という赤線が表示された
- 期待していた動作：JSONっぽい値を柔軟に扱いつつ、型エラーやlint警告が出ないこと

**再現手順**
1.resultJson や issues など、構造が未確定な値に any を付ける
2.ESLint / TypeScript のチェックが走る
3.Unexpected any. Specify a different type. が表示される

**エラーメッセージ / ログ**
- Unexpected any. Specify a different type.

**切り分けメモ（どこが怪しいか）**
- const rj: any = review.resultJson
- type ReviewJson = any
- map((i: any) => ...)
- DBの Json や LLMの返却値など、構造が固定しにくい箇所で発生しやすかった

**原因（Root Cause）**
- 「型がまだ分からない値」を安全に扱うべき場面で、any を使っていたのが原因
- ESLint の no-explicit-any ルールにより、明示的な any の使用が禁止されていた

**結論**
- any を使わず、unknown で受けてから型ガードで絞り込むのが正しい対応だった


**解決策（Fix）**
- any を unknown に置き換えた
- typeof v === "object" && v !== null や Array.isArray(...) などの型ガードを追加した
- 必要な箇所だけ Record<string, unknown> や unknown[] に変換して扱った

**確認（動作検証）**
- Unexpected any の赤線が消えることを確認
- 画面表示や JSON 整形処理が引き続き動くことを確認
- summary / scores / issues / inputSnapshot / resultJson の表示に問題がないことを確認

**よくある落とし穴**
- filter(Boolean) だけでは TypeScript が十分に絞り込めないことがある
- unknown に変えた後、すぐにプロパティアクセスすると別の型エラーになる
- Record<string, number> と決め打ちすると、実際には string が混ざっている場合に不整合が起きる


**再発防止（Prevention）**
- 構造が不明な値は最初から unknown で受ける
- DBの Json や LLMの返却値は、専用の型ガード関数を用意して扱う
- any を使いたくなったら、まず unknown + 型ガード で書けないか確認する


---



## 環境変数チェックリスト

> このプロジェクトで使う環境変数一覧（必須/任意）を整理します。  
> 値そのものは書かない（漏洩防止）。**“何が必要か”だけを書く**。

### 必須（ローカル・本番共通）
- `MICROCMS_SERVICE_DOMAIN`：microCMSのサービスドメイン
- `MICROCMS_API_KEY`：microCMS APIキー（読み取り用）
- `SUPABASE_URL`：Supabase URL
- `SUPABASE_ANON_KEY`：Supabase anon key（公開OKの範囲）
- `APP_BASE_URL`：アプリのベースURL（Webhook等で必要なら）

### 本番のみ（または特に注意）
- `SUPABASE_SERVICE_ROLE_KEY`：**絶対に公開しない**（サーバー専用）
- `MICROCMS_WEBHOOK_SECRET`：Webhook署名検証用（使う場合）

### よくあるミス
- `NEXT_PUBLIC_` を付けたら **ブラウザに配布される**（秘密を入れない）
- Vercelにenvを入れたのに **Preview/Productionで反映先が違う**ことがある（環境ごとに確認）

---

## 外部連携別メモ

### microCMS
**用途**
- 記事コンテンツ管理：`articles`
- 取得方法：`SDK / fetch`

**更新が反映されないとき**
- Webhook送信履歴（microCMS側）を確認
- Webhook URL：`https://[domain]/api/revalidate` が正しいか
- 署名/シークレットを使っている場合は一致しているか
- Vercel logsで `/api/revalidate` が呼ばれているか

**よくある落とし穴**
- 下書き/公開ステータス
- キャッシュ（ISR）設定の誤解

---

### Supabase
**用途**
- DB（Postgres）
- Auth（閲覧者ログイン）
- Storage（必要なら）

**Insert/Updateできないとき**
- RLS（Row Level Security）ポリシー
- 使用しているキー（anon/service role）の確認
- サーバー側でのみservice roleを使っているか

**よくある落とし穴**
- RLS有効なのにポリシー未設定
- クライアント側でservice roleを使ってしまう（NG）

---

### Vercel
**用途**
- Next.jsホスティング
- API Routes / Server Actions の実行
- logs確認

**本番だけ壊れるとき**
- envがProductionに入っているか（Previewだけに入ってないか）
- Build logs / Functions logs の確認
- Node/Edge実行環境の違い（必要ならruntime指定）

---

## 付録：このプロジェクトの“入口”一覧

- トップページ：`/`
- 個人ページ：`/person/[slug]`
- API（revalidate）：`/api/revalidate`
- DB：Supabase（Tables：User/Person/Review/...）
- CMS：microCMS（Content：articles）

