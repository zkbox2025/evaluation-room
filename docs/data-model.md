⚫︎DBは viewer/like/favorite のみ。schema.prismaに書かれてあるlikeのevaluationIdは、microCMS の evaluation のコンテンツID。favoriteに書かれてあるpersonSlugは、microCMSのpersonのslug。
⚫︎“カテゴリURLは将来的にASCII（英数字）slugへ統一予定（microCMSにcategories API（カテゴリーとslugを入力できる） を作ってpersonAPIのカテゴリーで参照する形式にする予定）。現在は slug 生成・変換を mapper に集約し、移行コストを最小化している。”なお、カテゴリーのname,slugと人物のname,slugがあるのでややこしい。
⚫︎公開終了したら必ず個別ページは404にしたい
⚫︎src/viewmodels/evaluationCard.mapper.tsにある関数をトップページと個人ページにインポートして使う予定
⚫︎src/domain/relations.ts（Like/Favorite など関係）で公開されているtype（EvaluationLikeとPersonFavorite）がまだ使われてないのでどこかでインポートして使う予定
⚫︎トップページの最新評価の右下に評価者の名前を入れるのと文字をクリックして個人ページに飛べるようにする予定（今は左下のURLをクリックしたら飛べるようになってる）
⚫︎「参照切れ掃除」用の軽い管理テーブル or ログを導入予定。いま likes/favorites は microCMS の削除・slug変更で残骸が残る設計。これは自然。ただAIフェーズに入るとイベント増えるので、運用としては以下のどれかがあると良い。
⭐️BrokenRefLog（参照切れ検知したら保存）
⭐️admin endpoint（今は作らないでもOK）
⭐️cron/手動で掃除するスクリプト（Prismaで一発）
「入れておくと安心」枠だけど、必須ではない。
⚫︎アプリ実行時（VercelなどにDBをデプロイ（公開）するなど）の直前に5432（末尾を/postgres）に切り替える.。
⚫︎Prisma 7の最新方針では、schema.prisma の中に url = ... と書くこと自体が禁止
⚫︎PR時はDB不要の軽量チェック（validate/build等）に徹し、本番への反映はローカルから（npx prisma migrate dev）を手動実行して確実性を担保する。接続トラブルを防ぐため、本番用には IPv4対応のPooler（6543番） を使い、.env と .env.prod を分離して誤操作のリスクを排除する。「開発はdev（.env）（npx prisma migrate dev --name ・・・）、本番はdeploy(.env.prod)（npx dotenv-cli -e .env.prod -- npx prisma migrate deploy）」の原則を守り、GitHub Actionsにタイムアウトを設定することで、ハングアップによるリソース浪費を防止する。
⚫︎prisma-schema-check.ymlは、schema.prismaをgithubのブランチにプッシュし、メインにマージする前のPR(申請)の段階でGitHub Actionsがチェックする項目が書かれている。
⚫︎github ActionsのRepository secretsにMICROCMS_API_KEYとMICROCMS_SERVICE_DOMAINが設定しているが、それは、PRチェック用でworkflowのBuildステップにenvを渡すために設定している。
【将来の流れ（本番AI）】
⚫︎PersonPage に「AIで評価文を作る」フォーム（prompt入力）
⚫︎Server Action or Route Handler でAI APIを呼ぶ
⚫︎成功/失敗どちらも AiGeneration に保存
⚫︎返ってきた結果をUI表示
⚫︎「前回生成」を再表示（すでに実装済みの土台を使う）

⚫︎viewer反応（like/fav）は snapshot には入れない（個人情報/ノイズ/再現性が崩れやすい）後で入れたくなったら viewerContext を optional で足す。snapshot は JSONで統一（AiReview の inputSnapshot Json にそのまま保存できる）
⚫︎差分（score:点数とissue：課題）は、レビューTOPページとレビュー個人ページのみにつけて、ページの見やすさの改善に努める（favoritesとlikesも後々つけてもいいかも）。
⚫︎運用ルール
・PROMPT_VERSION_INT は プロンプト文面 or 入力JSONの形を変えたら必ず上げる
例：新しい評価軸を追加、出力形式を変える、説明文を変える、入力スナップショットの構造を変える
・JSON_SCHEMA_VERSION は resultJsonの構造を変えたら必ず上げる
例：scoresに項目追加、issuesの形変更、フィールド名変更
・バージョン変更は lib/aiReview/versions.ts だけで行う（他は触らない）
・AiReview保存時は 必ず versions.ts の値を入れる（ハードコード禁止）
⚫︎microcmsのevaluationのkindはゆくゆくは削除でOK（使い方が決まらない）
⚫︎レビューページへのアクセスの仕方（URL）(secret=REVIEWS_SECRET)
レビュー一覧：https://evaluation-room.vercel.app/reviews?secret=...

レビューTop：https://evaluation-room.vercel.app/reviews/top?secret=...

レビューLikes：https://evaluation-room.vercel.app/reviews/likes?secret=...

レビューFavorites：https://evaluation-room.vercel.app/reviews/favorites?secret=...

レビューPerson別：https://evaluation-room.vercel.app/reviews/person/<slug>?secret=...

レビュー詳細：https://evaluation-room.vercel.app/reviews/<id>?secret=...