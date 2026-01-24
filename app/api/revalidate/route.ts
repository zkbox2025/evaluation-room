import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

type PersonRef = {
    id: string;
    slug: string;
};

type CMSObject = Record<string, unknown> & {
    person?: PersonRef;
};

type WebhookBody = {
  api?: string;     // "people" | "evaluations"
  type?: string;    // "create" | "edit" | "delete"
  contentId?: string;
  old?: CMSObject;
  new?: CMSObject;
};

function pickString(obj: CMSObject | undefined, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

// 参照フィールド person から slug を取り出す（new/oldどちらでも）
function pickRefSlug(obj: CMSObject | undefined, refKey: string): string | undefined {
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

  const body = await parseBody(req);
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const api = body.api;

  // people: slug
  const newSlug = pickString(body.new, "slug");
  const oldSlug = pickString(body.old, "slug");

  // evaluations: person（参照）から slug を取る
  const newPersonSlug = pickRefSlug(body.new, "person") ?? pickString(body.new, "personSlug");
  const oldPersonSlug = pickRefSlug(body.old, "person") ?? pickString(body.old, "personSlug");

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
    tags.push("evaluations:latest"); // トップの最新を確実に更新

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

return NextResponse.json({
  revalidated: true,
  api: body.api,
  type: body.type,
  contentId: body.contentId ?? null,
  tags: uniqTags,
  paths: uniqPaths,
  debug: {
   newPerson: body.new && typeof body.new === "object" ? body.new.person : null,
   oldPerson: body.old && typeof body.old === "object" ? body.old.person : null,
  },
});

}
export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, version: "revalidate-v3-ref", now: Date.now() });
}
