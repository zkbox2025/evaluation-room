// app/api/revalidate/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

type CMSObject = Record<string, unknown>;

type WebhookBody = {
  api?: string; // "people" | "evaluations" が想定。microCMSの設定次第で変わるので string で受ける
  type?: string; // "create" | "edit" | "delete"
  contentId?: string;
  old?: CMSObject;
  new?: CMSObject;
};

function pickString(obj: CMSObject | undefined, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

async function parseBody(req: NextRequest): Promise<WebhookBody | null> {
  try {
    return (await req.json()) as WebhookBody;
  } catch {
    return null;
  }
}

/**
 * microCMS Webhook -> Next revalidate
 * - people: トップ + /person/[slug]
 * - evaluations: トップ(最新) + /person/[slug]
 *
 * 返り値に tags/paths を含めて、検証が超ラクな版
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await parseBody(req);
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const api = body.api;

  // people は slug、evaluations は personSlug（または slug に入ってることもある想定）
  const newSlug = pickString(body.new, "slug");
  const oldSlug = pickString(body.old, "slug");

  const newPersonSlug =
    pickString(body.new, "personSlug") ?? pickString(body.new, "slug");
  const oldPersonSlug =
    pickString(body.old, "personSlug") ?? pickString(body.old, "slug");

  const tags: string[] = [];
  const paths: string[] = [];

  // ---- people ----
  if (api === "people") {
    tags.push("people"); // people一覧

    // 該当slugだけ（人）
    if (newSlug) tags.push(`people:${newSlug}`);
    if (oldSlug && oldSlug !== newSlug) tags.push(`people:${oldSlug}`);

    // トップ・個人ページへ影響
    paths.push("/");
    if (newSlug) paths.push(`/person/${newSlug}`);
    if (oldSlug && oldSlug !== newSlug) paths.push(`/person/${oldSlug}`);
  }

  // ---- evaluations ----
  if (api === "evaluations") {
    tags.push("evaluations"); // 評価全体
    tags.push("evaluations:latest"); // トップの「最新の評価」用（これが効くとトップが更新される）

    // 該当人物だけ（評価）
    if (newPersonSlug) tags.push(`evaluations:${newPersonSlug}`);
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug)
      tags.push(`evaluations:${oldPersonSlug}`);

    // トップ・個人ページへ影響
    paths.push("/");
    if (newPersonSlug) paths.push(`/person/${newPersonSlug}`);
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug)
      paths.push(`/person/${oldPersonSlug}`);
  }

  // 想定外のapiでも最低限更新（保険）
  if (tags.length === 0) {
    tags.push("people", "evaluations", "evaluations:latest");
    paths.push("/");
  }

  const uniqTags = unique(tags);
  const uniqPaths = unique(paths);

  // Next推奨 profile="max"（あなたの環境の型がこれを要求している前提）
  for (const t of uniqTags) revalidateTag(t, "max");
  for (const p of uniqPaths) revalidatePath(p);

  return NextResponse.json({
    revalidated: true,
    api: body.api,
    type: body.type,
    contentId: body.contentId ?? null,
    tags: uniqTags,
    paths: uniqPaths,
  });
}

/**
 * ブラウザで叩いて「今のデプロイがこの route.ts か」を確認する用
 * 例:
 *   https://<domain>/api/revalidate?secret=xxxx
 */
export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  // 反映確認しやすいように version を入れておく
  return NextResponse.json({
    ok: true,
    version: "revalidate-v2",
    now: Date.now(),
  });
}
