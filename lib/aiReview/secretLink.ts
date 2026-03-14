//ブラウザで表示するレビューページのURL（・・?secret=・・・）を作るための関数（リンク先用）
export function withReviewsSecret(path: string, secret?: string) {//pathとsecret(REVIEWS_SECRET)を引数とする
  if (!secret) return path;//secret(REVIEWS_SECRET)がなかったらそのままpathを返す
  const encoded = encodeURIComponent(secret);//URLで使ってはいけない文字（スペースや記号など）をURL専用の書き方に変換（エンコード）する（例：my%20pass%21）
  const sep = path.includes("?") ? "&" : "?";//pathに「?」が含まれていればセパレーター（sep）は「＆」とする。pathに「?」が含まれていなければセパレーター（sep）は?とする。
  return `${path}${sep}secret=${encoded}`;//pathとセパレーター（sep）とsecret=・・・を合体してURLとして返す。
}