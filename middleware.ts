//アクセスされたページが表示される前にクッキー（deviceID:端末ID）を確認・作成するファイル

//レビュー画面の閲覧制限 (特定のパスのみ)（開発者のみ閲覧可能）するファイル
//review画面を開発者のみ見れる画面にする理由は、reviewはmicrocmsとsupabaseのデータをAIでレビューし、UXの改善に活かすため、ユーザーが見る必要がないことから。
//URLの末尾に付くクエリパラメータ（例: ?secret=合言葉）をチェックし、それが環境変数で設定した値と一致するか確認し、一致しない場合は「404 Not Found（ページが見つかりません）」を表示して、ページの内容を隠蔽する。

// middleware.ts（プロジェクト直下）
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) deviceId cookie発行（共通）
  const response = NextResponse.next();
  const deviceId = request.cookies.get("deviceId")?.value;

  if (!deviceId) {
    response.cookies.set("deviceId", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
    });
  }

  // 2) /reviews の閲覧制限（secret必須）
  if (pathname.startsWith("/reviews")) {
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.REVIEWS_SECRET;

    if (!expected || !secret || secret !== expected) {
      const url = request.nextUrl.clone();
      url.pathname = "/404";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};