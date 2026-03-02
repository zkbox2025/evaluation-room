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
⚫︎PR時はDB不要の軽量チェック（validate/build等）に徹し、本番への反映はローカルから（npx prisma migrate dev）を手動実行して確実性を担保する。接続トラブルを防ぐため、本番用には IPv4対応のPooler（6543番） を使い、.env と .env.prod を分離して誤操作のリスクを排除する。「開発はdev（.env）、本番はdeploy(.env.prod)」の原則を守り、GitHub Actionsにタイムアウトを設定することで、ハングアップによるリソース浪費を防止する。
⚫︎prisma-schema-check.ymlは、schema.prismaをgithubのブランチにプッシュし、メインにマージする前のPR(申請)の段階でGitHub Actionsがチェックする項目が書かれている。