import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/*
function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return secret && secret === process.env.REVALIDATE_SECRET;
}
*/

export async function POST() {
  // if (!auth(req)) {
  //   return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  // }

  // const body = await req.json().catch(() => null);

  revalidateTag("people", "max");
  revalidateTag("evaluations", "max");

  return NextResponse.json({ revalidated: true, debug: 'no-auth' });
}

// 手動確認したいとき用（ブラウザで開ける）
export async function GET() {
  /*
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }
  */

  revalidateTag("people", "max");
  revalidateTag("evaluations", "max");

  return NextResponse.json({ revalidated: true, now: Date.now(), debug: 'no-auth' });
}
