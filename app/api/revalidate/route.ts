import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return secret && secret === process.env.REVALIDATE_SECRET;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  revalidateTag("people", "max");
  revalidateTag("evaluations", "max");

  return NextResponse.json({ revalidated: true, received: body });
}

// 手動確認したいとき用（ブラウザで開ける）
export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  revalidateTag("people", "max");
  revalidateTag("evaluations", "max");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
