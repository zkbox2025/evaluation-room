// app/api/health/integrity/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkCMSIntegrity } from "@/lib/checkIntegrity";

function auth(req: NextRequest) {//受付
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;//URLの末尾の合言葉とVercelの環境変数が一致するかの認証処理（auth関数）
}//必ずtrueかfalseの2択にする

export async function GET(req: NextRequest) {//auth関数がfalseだったら、結果を見せずにその場で追い返すGET関数
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });//401 Unauthorized エラーを返す
  }

  const result = await checkCMSIntegrity();//検査：通信テストなどの健康チェックを実行


  const status = result.ok ? 200 : 500;//判定：trueなら200、falseなら500

  return NextResponse.json(//報告：結果をレポートとして渡す
    {
      ...result,
      now: Date.now(),
      version: "integrity-v1",
    },
    { status }
  );
}
