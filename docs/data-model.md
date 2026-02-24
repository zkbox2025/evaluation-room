⚫︎DBは viewer/like/favorite のみ。schema.prismaに書かれてあるlikeのevaluationIdは、microCMS の evaluation のコンテンツID。favoriteに書かれてあるpersonSlugは、microCMSのpersonのslug。
⚫︎“カテゴリURLは将来的にASCII（英数字）slugへ統一予定（microCMSにcategories API（カテゴリーとslugを入力できる） を作ってpersonAPIのカテゴリーで参照する形式にする予定）。現在は slug 生成・変換を mapper に集約し、移行コストを最小化している。”なお、カテゴリーのname,slugと人物のname,slugがあるのでややこしい。
⚫︎公開終了したら必ず個別ページは404にしたい
⚫︎src/viewmodels/evaluationCard.mapper.tsにある関数をトップページと個人ページにインポートして使う予定
⚫︎src/domain/relations.ts（Like/Favorite など関係）で公開されているtype（EvaluationLikeとPersonFavorite）がまだ使われてないのでどこかでインポートして使う予定
⚫︎トップページの最新評価の右下に評価者の名前を入れるのと文字をクリックして個人ページに飛べるようにする予定（今は左下のURLをクリックしたら飛べるようになってる）