// app/api/revalidate/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";


function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

type CMSObject = Record<string, unknown>;
type CMSContents = Record<string, unknown>;

type WebhookBody = {
  service?: string;
  api?: string; // "people" | "evaluations"
  type?: string; // "create" | "edit" | "delete"
  id?: string;
  contentId?: string; // 念のため
  contents?: CMSContents; // microCMS実Webhookはここに old/new が入る
};

function isObj(v: unknown): v is Record<string, unknown> {//型ガード関数：unknown（何が来るかわからない）データを「これは中身があるオブジェクトだよ」とTypeScriptに教えるための関数
  return typeof v === "object" && v !== null;
}

/**
 * microCMS webhook の old/new（または "新規"）の中身は、
 * - 直接 publishValue を持つ場合
 * - { publishValue, draftValue } のラッパーの場合
 * があるので、publishValue があればそれを優先して返す
 */
function unwrapValue(node: unknown): CMSObject | undefined {
  if (!isObj(node)) return undefined;
  const publishValue = node["publishValue"];
  if (isObj(publishValue)) return publishValue;
  return node as CMSObject;
}

function pickString(obj: CMSObject | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

/** 参照フィールド（person / 人）から slug を取り出す */
function pickRefSlug(obj: CMSObject | undefined): string | undefined {
  if (!obj) return undefined;

  // 英語フィールド名 "person" / 日本語フィールド名 "人" どっちでも拾う
  const ref = obj["person"] ?? obj["人"];
  if (!isObj(ref)) return undefined;

  const slug = ref["slug"];
  return typeof slug === "string" ? slug : undefined;
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

export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const debug = req.nextUrl.searchParams.get("debug") === "1";

  const body = await parseBody(req);
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  // microCMS実Webhook: contents.old / contents.new が基本。
  // 表示上 "新規" になってるケースもあるので両対応
  const contents = isObj(body.contents) ? body.contents : undefined;

  const rawOld = contents?.["old"];
  const rawNew = contents?.["new"] ?? contents?.["新規"]; // ← any無しでOK

  const oldNode = unwrapValue(rawOld);
  const newNode = unwrapValue(rawNew);

  const api = body.api;

  // people: slug
  const newSlug = pickString(newNode, "slug");
  const oldSlug = pickString(oldNode, "slug");

  // evaluations: person参照からslug（または personSlug を残してる場合のフォールバック）
  const newPersonSlug = pickRefSlug(newNode) ?? pickString(newNode, "personSlug");
  const oldPersonSlug = pickRefSlug(oldNode) ?? pickString(oldNode, "personSlug");

  const tags: string[] = [];
  const paths: string[] = [];

  // ---- people ----
  if (api === "people") {
    tags.push("people");
    if (newSlug) tags.push(`people:${newSlug}`);
    if (oldSlug && oldSlug !== newSlug) tags.push(`people:${oldSlug}`);

    paths.push("/");
    if (newSlug) paths.push(`/person/${newSlug}`);
    if (oldSlug && oldSlug !== newSlug) paths.push(`/person/${oldSlug}`);
  }

  // ---- evaluations ----
  if (api === "evaluations") {
    tags.push("evaluations");
    tags.push("evaluations:latest");

    if (newPersonSlug) tags.push(`evaluations:${newPersonSlug}`);
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug) {
      tags.push(`evaluations:${oldPersonSlug}`);
    }

    paths.push("/");
    if (newPersonSlug) paths.push(`/person/${newPersonSlug}`);
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug) {
      paths.push(`/person/${oldPersonSlug}`);
    }
  }

  // 保険
  if (tags.length === 0) {
    tags.push("people", "evaluations", "evaluations:latest");
    paths.push("/");
  }

  const uniqTags = unique(tags);
  const uniqPaths = unique(paths);

  for (const t of uniqTags) revalidateTag(t, "max");
  for (const p of uniqPaths) revalidatePath(p);

  const debugData = debug
    ? {
        receivedTopKeys: contents ? Object.keys(contents) : null,
        rawOldKeys: isObj(rawOld) ? Object.keys(rawOld) : null,
        rawNewKeys: isObj(rawNew) ? Object.keys(rawNew) : null,
        newPersonSlug,
        oldPersonSlug,
        newRef: newNode ? (newNode["person"] ?? newNode["人"] ?? null) : null,
        oldRef: oldNode ? (oldNode["person"] ?? oldNode["人"] ?? null) : null,
      }
    : undefined;

  return NextResponse.json({
    revalidated: true,
    api: body.api ?? null,
    type: body.type ?? null,
    contentId: body.contentId ?? body.id ?? null,
    tags: uniqTags,
    paths: uniqPaths,
    ...(debug ? { debug: debugData } : {}),
  });
}

export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    version: "revalidate-v4-no-any",
    now: Date.now(),
  });
}
