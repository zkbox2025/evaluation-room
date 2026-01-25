import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

type CMSObject = Record<string, unknown>;

type WebhookBody = {
  api?: string;
  type?: string;
  contentId?: string;
  old?: CMSObject;
  new?: CMSObject;
};

function pickString(obj: CMSObject | undefined, key: string) {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

function pickRefSlug(obj: CMSObject | undefined, refKey: string) {
  const ref = obj?.[refKey];
  if (ref && typeof ref === "object") {
    const slug = (ref as Record<string, unknown>)["slug"];
    return typeof slug === "string" ? slug : undefined;
  }
  return undefined;
}

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const debugOn = req.nextUrl.searchParams.get("debug") === "1";

  let body: WebhookBody | null = null;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    body = null;
  }
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const api = body.api;

  const newSlug = pickString(body.new, "slug");
  const oldSlug = pickString(body.old, "slug");

  // evaluations の人物slug（参照person.slug or personSlug or slug）
  const newPersonSlug =
    pickRefSlug(body.new, "person") ??
    pickString(body.new, "personSlug") ??
    pickString(body.new, "slug");

  const oldPersonSlug =
    pickRefSlug(body.old, "person") ??
    pickString(body.old, "personSlug") ??
    pickString(body.old, "slug");

  const tags: string[] = [];
  const paths: string[] = [];

  if (api === "people") {
    tags.push("people");
    if (newSlug) tags.push(`people:${newSlug}`);
    if (oldSlug && oldSlug !== newSlug) tags.push(`people:${oldSlug}`);

    paths.push("/");
    if (newSlug) paths.push(`/person/${newSlug}`);
    if (oldSlug && oldSlug !== newSlug) paths.push(`/person/${oldSlug}`);
  }

  if (api === "evaluations") {
    tags.push("evaluations", "evaluations:latest");
    if (newPersonSlug) tags.push(`evaluations:${newPersonSlug}`);
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug) tags.push(`evaluations:${oldPersonSlug}`);

    paths.push("/");
    if (newPersonSlug) paths.push(`/person/${newPersonSlug}`);
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug) paths.push(`/person/${oldPersonSlug}`);
  }

  if (tags.length === 0) {
    tags.push("people", "evaluations", "evaluations:latest");
    paths.push("/");
  }

  const uniqTags = unique(tags);
  const uniqPaths = unique(paths);

  for (const t of uniqTags) revalidateTag(t, "max");
  for (const p of uniqPaths) revalidatePath(p);

  const res: Record<string, unknown> = {
    revalidated: true,
    api: body.api ?? null,
    type: body.type ?? null,
    contentId: body.contentId ?? null,
    tags: uniqTags,
    paths: uniqPaths,
  };

  if (debugOn) {
    res.debug = {
      receivedNewKeys: body.new ? Object.keys(body.new) : null,
      receivedOldKeys: body.old ? Object.keys(body.old) : null,
      newPersonRaw: body.new?.["person"] ?? null,
      oldPersonRaw: body.old?.["person"] ?? null,
      newPersonSlug,
      oldPersonSlug,
      newSlug,
      oldSlug,
    };
  }

  return NextResponse.json(res);
}

export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }
  const debugOn = req.nextUrl.searchParams.get("debug") === "1";
  return NextResponse.json({
    ok: true,
    version: "revalidate-v4",
    now: Date.now(),
    debug: debugOn ? { note: "debug=1 is enabled" } : undefined,
  });
}
