import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // ✅ 一時デバッグ：受信データの形をそのまま返す
  return NextResponse.json({
    ok: true,
    version: "webhook-debug-v1",
    receivedKeys: body ? Object.keys(body) : null,
    api: body?.api ?? null,
    type: body?.type ?? null,
    contentId: body?.contentId ?? null,
    newKeys: body?.new ? Object.keys(body.new) : null,
    oldKeys: body?.old ? Object.keys(body.old) : null,

    // person の生データを見る
    newPersonRaw: body?.new?.person ?? null,
    oldPersonRaw: body?.old?.person ?? null,

    // personSlug があるならそれも見る（以前の設計との互換）
    newPersonSlugRaw: body?.new?.personSlug ?? null,
    oldPersonSlugRaw: body?.old?.personSlug ?? null,

    // 全体（重いなら消してOK）
    body,
  });
}

export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, version: "webhook-debug-v1", now: Date.now() });
}
