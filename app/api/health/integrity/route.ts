// app/api/health/integrity/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkCMSIntegrity } from "@/lib/checkIntegrity";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const result = await checkCMSIntegrity();

  // ok=false のときだけ 500 にする（CIや監視が拾いやすい）
  const status = result.ok ? 200 : 500;

  return NextResponse.json(
    {
      ...result,
      now: Date.now(),
      version: "integrity-v1",
    },
    { status }
  );
}
