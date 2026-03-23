# Ops / 運用メモ（Webhook・Health・DB migrate）
このドキュメントは「本番運用・デバッグ・DB反映」に必要な手順だけをまとめたもの。

---

## 0. 前提（データの役割分担）
- **microCMS（静的）**：people / evaluations  
- **DB（動的）**：Viewer / Like / Favorite / AiReview

補足（参照キー）
- `Like.evaluationId` は **microCMSの evaluations のコンテンツID**
- `Favorite.personSlug` は **microCMSの people の slug**

---

## 1. microCMS → 本番反映（Webhook → revalidate）
本番（Vercel）は Next.js のキャッシュを使うため、microCMS更新は Webhook で再検証して反映する。

流れ：
1. microCMS で people / evaluations を作成・編集・削除  
   - people.slug は **英小文字・数字・ハイフン**
2. microCMS Webhook が `POST /api/revalidate` を叩く
3. Next.js 側で `revalidateTag` / `revalidatePath` を実行
4. 次回アクセス時にキャッシュが更新され、最新データが表示される

注意：
- ローカル（localhost）は microCMS Webhook が届かないため「本番で反映確認」が基本。

---

## 2. Webhookデバッグ（受信側 /api/revalidate）

### 2-1. 目的
microCMSから飛ぶWebhookの中身を、Nextの `/api/revalidate` が想定通りに解釈できているか確認する。  
（例：評価がどの人物に紐づくかを拾い、personSlug を抽出できているか）

### 2-2. debug=1 で解析結果を返す
Webhook URLの末尾に `&debug=1` を一時的に付与すると、受信側の解析結果がレスポンスに含まれる。

例：
- `https://evaluation-room.vercel.app/api/revalidate?secret=REVALIDATE_SECRET&debug=1`

### 2-3. curl（疑似Webhook）例：evaluations edit
※ secretは絶対に共有しない

```bash
curl -s -X POST \
  "https://evaluation-room.vercel.app/api/revalidate?secret=REVALIDATE_SECRET&debug=1" \
  -H "content-type: application/json" \
  -d '{
    "api":"evaluations",
    "type":"edit",
    "contents":{
      "新規":{
        "publishValue":{
          "人":{"slug":"matsumoto-hitoshi"}
        }
      }
    }
  }' | cat
### 2-4. 期待するレスポンスの見方

以下が揃っていれば「受信側の解釈OK」：

tags に evaluations, evaluations:latest, evaluations:<personSlug> が含まれる

paths に / と /person/<personSlug> が含まれる

debug に newPersonSlug や newRef が出て、slugが一致している


## 3. ヘルスチェック（microCMS整合性チェック）
### 3-1. 目的

microCMSのデータ整合性（参照切れなど）を確認する。

チェック内容：

people.slug の重複チェック

people.slug の形式チェック（英小文字・数字・ハイフン）

evaluations → people の参照切れチェック（最重要）

### 3-2. 実行URL

本番：

https://evaluation-room.vercel.app/api/health/integrity?secret=REVALIDATE_SECRET

ローカル：

http://localhost:3000/api/health/integrity?secret=REVALIDATE_SECRET

3-3. curl例
curl -s \
  "https://evaluation-room.vercel.app/api/health/integrity?secret=REVALIDATE_SECRET" | cat


## 4. Prisma migrate 運用（開発DB → 本番DB）
### 4-1. 結論（運用方針）

PR段階では DB不要の軽量チェック（validate/build等） に徹する

本番DB反映は CIで deployしない（接続トラブル/ハング等が起きうるため）

本番への反映は ローカルから migrate deploy を手動実行して確実性を担保する

補足：

Prisma 7の方針として schema.prisma に url=... を書くのは禁止

接続先は prisma.config.ts から DATABASE_URL を参照する運用に統一する

### 4-2. 開発（ローカルDB）で migration を作る（dev）

使うenv：.env（開発DB用）

実行：migrate dev（migration作成）→ generate（型更新）

npx prisma migrate dev --name <meaningful_name>
npx prisma generate

### 4-3. 本番DBへ適用する（deploy）

使うenv：.env.prod（本番DB用）

実行：migrate deploy（適用のみ）

npx dotenv-cli -e .env.prod -- npx prisma migrate deploy

注意（重要）：

本番DBに migrate dev は絶対にしない
(migrate dev は状況によって “Database reset required” が発生し得るため)

本番DBにマイグレーションできない場合（何分待ってもできない場合など）は、6543から5432にしてみるといい

### 4-4. GitHub Actions / PRチェックについて（最低限）

prisma-schema-check.yml は、PR段階で schema / build などをチェックするためのworkflow

GitHub Actions の Repository secrets に
「MICROCMS_API_KEY」と「MICROCMS_SERVICE_DOMAIN」
を登録しているのは、PRチェックの build ステップで env が必要になるため

## 5. .env / .env.prod の使い分け（事故防止）
### 5-1. 原則

開発：.env（dev）で migrate dev

本番：.env.prod（deploy）で migrate deploy

### 5-2. .env（開発用：ローカルDB）

ローカルDB（Docker Postgres等）への接続を入れる

microCMSやsecret、OpenAIのキーも開発用として入れる

例（雛形）：

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_dev?schema=public"
MICROCMS_SERVICE_DOMAIN="..."
MICROCMS_API_KEY="..."
REVALIDATE_SECRET="..."
REVIEWS_SECRET="..."
OPENAI_API_KEY="..."


### 5-3. .env.prod（本番DB migrate deploy 用）

本番DBへの接続だけを置く（最小にする）

Pooler(6543)を採用（接続トラブル低減のため）

Git管理しない（.gitignore）

例（雛形）：

DATABASE_URL="postgresql://...@aws-...pooler.supabase.com:6543/postgres?pgbouncer=true"


## 6. ReviewページのアクセスURL（secret=REVIEWS_SECRET）

レビュー一覧：

https://evaluation-room.vercel.app/reviews?secret=...

Top：

https://evaluation-room.vercel.app/reviews/top?secret=...

Likes：

https://evaluation-room.vercel.app/reviews/likes?secret=...

Favorites：

https://evaluation-room.vercel.app/reviews/favorites?secret=...

Person別：

https://evaluation-room.vercel.app/reviews/person/<slug>?secret=...

詳細：

https://evaluation-room.vercel.app/reviews/<id>?secret=...

注意：

secret をURLに保持し続ける設計は漏洩しやすい（改善案は design-notes に記載）

## 7. AIレビュー運用ルール（versions）

運用ルール：

PROMPT_VERSION_INT：プロンプト文面 or 入力JSONの形を変えたら必ず上げる
例）評価軸の追加、出力形式変更、説明文変更、snapshot構造変更

SCHEMA_VERSION_INT：resultJsonの構造を変えたら必ず上げる
例）scores項目追加、issues構造変更、フィールド名変更

バージョン変更は lib/aiReview/versions.ts だけで行う（他は触らない）

AiReview保存時は versions.ts の値を必ず入れる（ハードコード禁止）

## 8. AI呼び出し（callLLMReview）運用上の注意

本番では必ず「実LLM呼び出し」しか使えないようにする（環境変数などで強制）

失敗時も保存（status=error, errorMessage）される前提で運用する

## 9. （任意）参照切れの運用メモ

likes/favorites は microCMS の削除・slug変更で残骸が出うる設計（自然）。

AIフェーズでイベントが増える場合、運用としては以下のどれかを追加すると安心：

BrokenRefLog（参照切れ検知したら保存）

管理用 endpoint（今は不要でもOK）

cron/手動スクリプト（Prismaで一発掃除）※必須ではない（運用安心枠）。


---

必要なら次に、
- この `docs/ops.md` を README の「Docs」リンクから参照するための **README末尾ブロック**（3リンク固定）
- `docs/design-notes.md` も同じ温度感（運用ではなく思想/学習中心）で整形

も続けて一気に作れます。