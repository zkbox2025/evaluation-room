//アクセスされたページが表示される前にクッキー（deviceID:端末ID）を確認・作成するファイル

//レビュー画面の閲覧制限 (特定のパスのみ)（開発者のみ閲覧可能）するファイル
//review画面を開発者のみ見れる画面にする理由は、reviewはmicrocmsとsupabaseのデータをAIでレビューし、UXの改善に活かすため、ユーザーが見る必要がないことから。
//URLの末尾に付くクエリパラメータ（例: ?secret=合言葉）をチェックし、それが環境変数で設定した値と一致するか確認し、一致しない場合は「404 Not Found（ページが見つかりません）」を表示して、ページの内容を隠蔽する。

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server' // serverに変更

export function proxy(request: NextRequest) {
const { pathname } = request.nextUrl
  
  // 共通レスポンス（ヘッダー確認用）
  const response = NextResponse.next();
  response.headers.set("x-mw-hit", "1"); // ✅ middlewareが実行された証拠
  response.headers.set("x-mw-path", pathname);

  // --- 1. レビュー画面の閲覧制限 (特定のパスのみ) ---
  if (pathname.startsWith("/reviews")) {//アクセスしている場所が/reviewsで始まるページかどうかを確認し、当てはまらないならこれ以降はスルーする。
    const secret = request.nextUrl.searchParams.get("secret");////URLから合言葉（?secret=）を取り出す
    const expected = process.env.REVIEWS_SECRET;//.envからサーバー側で設定していた合言葉を読み込む（Vercelに公開後はVercelの環境変数を読み込む）

// ✅ envが取れてるか確認（値そのものは出さない）
    response.headers.set("x-mw-has-secret", secret ? "1" : "0");
    response.headers.set("x-mw-has-expected", expected ? "1" : "0");

    if (!expected || !secret || secret !== expected) {//この3点に当てはまれば以下を実行する。①!expected: サーバー側に合言葉が設定されていない（設定ミス）②!secret: URLに合言葉がついていない③secret !== expected: URLの合言葉が、envもしくはVercelの環境変数と違っている

      const url = request.nextUrl.clone();//今アクセスしようとしているURLをコピーする
      url.pathname = "/404";//行き先を /reviews から /404（エラーページ）に書き換る
      url.search = ""; // クエリも全部消す

      const rewritten = NextResponse.rewrite(url);
      rewritten.headers.set("x-mw-hit", "1");
      rewritten.headers.set("x-mw-blocked", "1"); // ✅ ブロックした証拠
      rewritten.headers.set("x-mw-path", pathname);
      rewritten.headers.set("x-mw-has-secret", secret ? "1" : "0");
      rewritten.headers.set("x-mw-has-expected", expected ? "1" : "0");
      return rewritten;
    }
  }

  // --- 2. デバイスIDの発行 (共通処理) ---

  
  // 1. リクエストから現在のdeviceID(クッキー)を確認
  const deviceId = request.cookies.get('deviceId')?.value

  // 2. なければ新しく発行してレスポンスにセットする
  if (!deviceId) {
    const newId = crypto.randomUUID() // ライブラリ不要で動きます
    response.cookies.set('deviceId', newId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
    })
  }

  return response// 4. レスポンスを返す
}

export const config = {// 4. ミドルウェアを適用するパスを指定
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',// これら以外のすべてのパスに適用（毎回ミドルウェアを起動するのを防ぎサーバーへの負担軽減のため）
}
