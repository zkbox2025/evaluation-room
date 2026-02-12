import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server' // serverに変更

export function middleware(request: NextRequest) {
  // 1. まずレスポンスの準備をする
  const response = NextResponse.next()
  
  // 2. リクエストから現在のCookieを確認
  const deviceId = request.cookies.get('deviceId')?.value

  // 3. なければ新しく発行してレスポンスにセットする
  if (!deviceId) {
    const newId = crypto.randomUUID() // ライブラリ不要で動きます
    response.cookies.set('deviceId', newId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  return response
}

export const config = {// 4. ミドルウェアを適用するパスを指定
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',// すべてのパスに適用
}
