# 評価の部屋（Evaluation Room）

本番URL: https://evaluation-room.vercel.app

著名人に対する「ポジティブな評価」を集めて閲覧できる Web アプリです。  
管理者が microCMS でコンテンツ（人物/評価）を更新し、閲覧者は Like / Favorite を付けたり、開発者向けに AIレビュー（UI/UX診断）の履歴・差分を確認できます。

## 主な機能
- 人物一覧 / 個人ページ（評価タイムライン）
- カテゴリ別ページ（検索・並び替え）
- Like / Favorite（DBに保存）
- AIレビュー（構造化JSONで保存、履歴・詳細・差分表示、レート制限・エラー保存）
（ユーザー向け機能ではなく、開発者向けの改善ループ）
- microCMS Webhook による自動再検証（revalidateTag / revalidatePath）
- データ整合性チェックAPI（microCMS参照切れ等の検査）

## 技術スタック
- Next.js（App Router）/ React / TypeScript / Tailwind CSS
- microCMS（Headless CMS）
- PostgreSQL（Supabase） + Prisma
- OpenAI API（Responses API）※AIレビュー
- Vercel（デプロイ）

## アーキテクチャの考え方（重要）
- **microCMS = 編集者が管理する“静的コンテンツ”の正**  
  - people / evaluations（Markdown → HTML）
- **DB = 閲覧者が生む“動的データ”の正**  
  - viewer / like / favorite / aiReview
- Next.js が両者を合成して表示し、更新は `revalidateTag/path` で反映します。

## microCMS 更新 → 本番反映（Webhook）
1. microCMS で people / evaluations を更新（people.slug は `a-z0-9-`）
2. microCMS Webhook → `POST /api/revalidate?secret=...`
3. Next.js が `revalidateTag` / `revalidatePath` を実行
4. 次回アクセスで最新データに更新

> ローカル（localhost）は Webhook が届かないため自動反映されません。

## セットアップ（環境変数）
### microCMS
- `MICROCMS_SERVICE_DOMAIN`
- `MICROCMS_API_KEY`

### Webhook / Health
- `REVALIDATE_SECRET`

### DB（Postgres）
- `DATABASE_URL`

### Reviews閲覧制限（開発者用）
- `REVIEWS_SECRET`

### OpenAI（AIレビュー）
- `OPENAI_API_KEY`

## 起動方法
```bash
npm install
npm run dev

# 設計メモ（まとめ）

- 対象：推しの「良い評価」を集めて眺めたい人向け  
- 解決：ポジティブ評価を集約し、閲覧体験を軽くする  
- 分離：microCMS=静的コンテンツ / DB=ユーザー行動（Like/Favorite/AI review）  
- 反映：microCMS更新はWebhook→revalidateTag/pathで自動反映  
- 識別：middlewareでdeviceId cookie発行 → ViewerとしてDB管理  
- AIレビュー：snapshot→prompt→LLM(JSON schema)→Zod検証→DB保存、履歴/差分/ガード込み


詳細はこちら

## Docs

[運用メモ（Webhook / Health / migrate）](./docs/ops.md)  
[設計・学習メモ](./docs/design-notes.md)  
[失敗ログ / Troubleshooting](./docs/troubleshooting.md)

