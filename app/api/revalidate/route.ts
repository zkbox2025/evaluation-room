// app/api/revalidate/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && secret === process.env.REVALIDATE_SECRET;
}

type UnknownObj = Record<string, unknown>;

type WebhookBody = {
  service?: string;
  api?: string; // "people" | "evaluations"
  id?: string;
  type?: string; // "create" | "edit" | "delete"
  contents?: {
    old?: UnknownObj;
    new?: UnknownObj;
  };
};

function isObj(v: unknown): v is UnknownObj {
  return !!v && typeof v === "object";
}

function pickString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * microCMS webhook は
 *  - contents.new.publishValue / contents.new.draftValue
 *  - contents.old.publishValue / contents.old.draftValue
 * のどこかに実データが入ることが多い
 */
function unwrapValue(node: UnknownObj | undefined): UnknownObj | undefined {
  if (!node) return undefined;
  const pv = isObj(node.publishValue) ? node.publishValue : undefined;
  const dv = isObj(node.draftValue) ? node.draftValue : undefined;
  return pv ?? dv ?? node;
}

/**
 * 参照フィールド（person / 人）から slug を拾う
 * - person.slug
 * - 人.slug
 */
function pickPersonSlug(value: UnknownObj | undefined): string | undefined {
  if (!value) return undefined;

  // 参照フィールド名の候補（フィールドIDが日本語になっている場合も拾う）
  const ref =
    (isObj(value.person) ? value.person : undefined) ??
    (isObj((value as UnknownObj)["人"]) ? (value as UnknownObj)["人"] : undefined);

  if (isObj(ref)) {
    return pickString(ref.slug);
  }

  // 旧設計の personSlug も一応拾っておく（保険）
  return pickString((value as UnknownObj).personSlug);
}

function pickSlug(value: UnknownObj | undefined): string | undefined {
  if (!value) return undefined;
  return pickString(value.slug);
}

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const debug = req.nextUrl.searchParams.get("debug") === "1";

  const body = (await req.json().catch(() => null)) as WebhookBody | null;
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const api = body.api;

  // new/old の実データを publishValue/draftValue から取り出す
  const newNode = unwrapValue(isObj(body.contents?.new) ? body.contents?.new : undefined);
  const oldNode = unwrapValue(isObj(body.contents?.old) ? body.contents?.old : undefined);

  // people: slug
  const newSlug = pickSlug(newNode);
  const oldSlug = pickSlug(oldNode);

  // evaluations: person参照（person or 人）から slug
  const newPersonSlug = pickPersonSlug(newNode);
  const oldPersonSlug = pickPersonSlug(oldNode);

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

  // 保険：apiが想定外でもトップだけ更新
  if (tags.length === 0) {
    tags.push("people", "evaluations", "evaluations:latest");
    paths.push("/");
  }

  const uniqTags = unique(tags);
  const uniqPaths = unique(paths);

  for (const t of uniqTags) revalidateTag(t, "max");
  for (const p of uniqPaths) revalidatePath(p);

  const res: UnknownObj = {
    revalidated: true,
    api,
    type: body.type ?? null,
    id: body.id ?? null,
    tags: uniqTags,
    paths: uniqPaths,
  };

  if (debug) {
    res.debug = {
      newKeys: newNode ? Object.keys(newNode) : null,
      oldKeys: oldNode ? Object.keys(oldNode) : null,
      newSlug,
      oldSlug,
      newPersonSlug,
      oldPersonSlug,
      // 「人」参照が本当に入ってるか確認用
      newPersonRaw: newNode ? ((newNode as UnknownObj)["人"] ?? newNode.person ?? null) : null,
      oldPersonRaw: oldNode ? ((oldNode as UnknownObj)["人"] ?? oldNode.person ?? null) : null,
    };
  }

  return NextResponse.json(res);
}

export async function GET(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, version: "revalidate-v4-microcms-real", now: Date.now() });
}
