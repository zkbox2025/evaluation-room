# 評価の部屋
（Evaluation Room）

著名人に対するポジティブな評価を保存・閲覧するための Webサイトです。 

## 使用技術

*   Next.js (App Router)
*   TypeScript
*   Tailwind CSS
*   Git / GitHub
*   Markdown CMS（Front Matter でデータ管理）
*   microCMS / Webhook / ISR(revalidateTag/path)

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
⚫︎ローカル環境 (http://localhost:3000/)では、VSCodeでコードをいじると即反映してくれる
　本番環境 (https://evaluation-room.vercel.app)では、コードの変更をGitpushしてVercelがサーバー上で新しいサイトをデプロイし終わると、変更が反映される。



