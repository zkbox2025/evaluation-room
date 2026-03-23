# Design Notes / 設計・学習メモ

このドキュメントは「思想・設計判断・学び・将来案」を残す場所。  
運用手順（Webhook / health / migrate など）は `docs/ops.md` に集約する。

---

## 1. 何のためのプロダクトか（思想）
### 誰に向けたアプリか
- 自分の好きな著名人（推し）に対する「他者からの良い評価」を読み、推しが認められて嬉しい人向け。
- 読むだけでも成立し、ふらっと来て・ふらっと去れる “軽さ/静けさ” を重視。

### 何を解決するか
- 推しが評価される言葉に触れることで、  
  **自分の審美眼や判断（推しを好きでいること）を肯定できる**。
- ネット上の攻撃的な空気に対して、ポジティブな言葉だけを集めた “小さな避難所” を作る。

---

## 2. 全体設計（データの役割分担）
### 静的コンテンツ（管理者が作る）
- **microCMS**
  - `people`（人物）
  - `evaluations`（評価本文）

### 動的データ（ユーザーが生む）
- **DB（PostgreSQL / Prisma）**
  - Viewer：cookie の `deviceId` を起点に作る「閲覧者」の識別
  - Like / Favorite：ユーザーの反応（動的）
  - AiReview：レビュー履歴（内部用）

参照キーの整理（重要）
- `Like.evaluationId` は **microCMS evaluations のコンテンツID**
- `Favorite.personSlug` は **microCMS people の slug**
- ※ microCMS 側で削除/slug変更が起きると DB に残骸が残り得る（自然な設計上のトレードオフ）

---

## 3. UX設計の判断
### “読む体験” を最優先
- 一覧で眺められる
- 1つ1つの言葉に向き合える
- シンプルで静かなデザイン

### 反応（Like / Favorite）は「軽い意思表示」
- ログインなし（cookieベースの Viewer 識別）で、押した瞬間にUI反映する。
- DB更新後に `revalidatePath` で再描画し、ページ全体リロード無しで “変わった感” を出す。

### サイドバーは「軽量表示」
- HTML表示よりも “文字列” を優先（読みやすさ、崩れ防止）
- 本文は必要な場所だけ HTML 表示（dangerouslySetInnerHTML）

---

## 4. キャッシュ設計（Next.js / microCMS）
- `unstable_cache` + `revalidateTag` / `revalidatePath` + microCMS Webhook の組み合わせで、
  - **普段は高速**
  - **更新時は確実に反映**
  の両立を狙う。

学び（設計の腹落ち）
- キャッシュは「速さの代償として古さが混ざる」  
  → “いつ捨てるか” をWebhookで明示できるのが大きい。
- Tag/Path の命名が1文字でもズレると動かない  
  → 命名は「運用上の契約」として扱う。

---

## 5. AIレビュー基盤（目的と設計判断）
### 目的
- “ユーザーに見せる機能” ではなく、**開発/改善のための内部ツール**。
- ページ状態のスナップショットをAIに渡し、UX/UI/性能などの観点でレビューを残す。

### 設計判断
- スナップショットは **JSONで統一**（そのまま `AiReview.inputSnapshot` に保存できる）
- viewer反応（like/fav）は snapshot に入れない  
  - 個人情報/ノイズ/再現性が崩れやすい  
  - 入れたくなったら `viewerContext` を optional 追加する

### 差分表示の扱い
- 差分（scores増減 / issues件数差）は、まず **Top と Person のみ**に付けて “見やすさ” を優先。
- likes/favorites にも付けるのは後で検討。

### バージョン運用（重要）
- PROMPT_VERSION_INT：プロンプト文面 or 入力JSONの形を変えたら上げる  
  （評価軸追加、出力形式変更、説明文変更、snapshot構造変更など）
- SCHEMA_VERSION_INT：resultJsonの構造を変えたら上げる  
  （scores項目追加、issues構造変更、フィールド名変更など）
- バージョン変更は `lib/aiReview/versions.ts` のみで行う（分散させない）
- 保存時は versions.ts の値を必ず使う（ハードコード禁止）

### LLM呼び出しの注意
- 本番では「実LLM実装」しか使えないようにする（環境変数で強制）
- 失敗もログとしてDB保存される設計にして、デバッグ可能にする

---

## 6. 学習ログ（要点だけ）
### Webhook / ISR / 再検証
- “更新を検知してキャッシュを捨てる” をWebhookでやると運用が楽になる。
- GETは “共有/キャッシュ向き”、POSTは “中身を送って更新する” のに向く。

### Prisma / migrate
- Prisma 7 では `schema.prisma` に `url=...` は書かない（禁止）
- PRでは DB不要のチェックに寄せ、本番反映はローカルから確実に行う（運用判断）

### Middleware（入口での交通整理）
- 入口で cookie を発行し Viewer を作ると、ログインなしで反応を保存できる。
- `/reviews` のような保護ページでは、Server Action の内部リクエストまで弾かないように設計が必要。

---

## 7. 将来改善案（Backlog）
### コンテンツ/URL
- カテゴリURLを ASCII slug に統一したい  
  - microCMSに `categories` API（name/slug）を作り、people が参照する形式に移行予定  
  - 現状は slug生成/変換を mapper に集約し、移行コストを最小化している  
  - 「category の name/slug」と「person の name/slug」が混在するので、境界を明確にする

- 公開終了したら個別ページは必ず 404 にしたい  
  - 公開期間/公開フラグの導入 or 404制御を検討

### UI/表示
- トップページ最新評価：右下に評価者名を表示し、クリックで個人ページに遷移できるようにする  
  （現状は /person/... のURLリンクのみ）

### ViewModel/型の整理
- `src/viewmodels/evaluationCard.mapper.ts` の関数をトップ/個人ページ側で利用する（重複削減）
- `src/domain/relations.ts` の type（EvaluationLike / PersonFavorite）をどこかで採用して型の統一度を上げる

### 参照切れの運用強化（安心枠）
likes/favorites は microCMS の削除・slug変更で残骸が残る設計。AIフェーズでイベントが増えるなら以下を検討：
- BrokenRefLog（参照切れ検知したら保存）
- admin endpoint（今は作らないでもOK）
- cron/手動スクリプト（Prismaで一発掃除）

### secretの扱い（漏洩対策）
- 現状：`?secret=` をURLに保持し続ける（漏洩しやすい）
- 改善案：最初だけ `?secret=` → 通過したら `Set-Cookie` で `reviewsAuth=1`（httpOnly）を付与  
  以後はcookieで判定し、URLからsecretを消す

### AIレビューのエラー設計
- `RunAiReviewResult` に `LLM_ERROR` / `SNAPSHOT_ERROR` を追加
- `runAiReview.ts` の返却・`RunAiReviewButton` のUI分岐を拡張
- `callLLMReview` 側で専用エラー（例：`LlmCallError`）を作る

### microCMSの評価kind
- evaluation.kind は将来的に削除でもOK（使い方が固まっていない）

---

## 8. レビューページ URL（メモ）
secret=REVIEWS_SECRET が必要。

- 一覧：`/reviews?secret=...`
- Top：`/reviews/top?secret=...`
- Likes：`/reviews/likes?secret=...`
- Favorites：`/reviews/favorites?secret=...`
- Person別：`/reviews/person/<slug>?secret=...`
- 詳細：`/reviews/<id>?secret=...`