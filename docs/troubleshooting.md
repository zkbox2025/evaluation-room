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

