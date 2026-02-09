// app/api/revalidate/route.ts＝キャッシュの削除を命令するファイル
import type { NextRequest } from "next/server";//NextRequest型をnext/serverから持ってくる
import { NextResponse } from "next/server";//NextResponseをnext/serverから持ってくる
import { revalidatePath, revalidateTag } from "next/cache";//next/cacheからrevalidatePathとrevalidateTagを持ってくる


function auth(req: NextRequest) {//認証関数：URLの?secret=xxxを取得し、環境変数の REVALIDATE_SECRET と比較して認証を行う関数
  const secret = req.nextUrl.searchParams.get("secret");// URLの?secret=xxxを取得
  return !!secret && secret === process.env.REVALIDATE_SECRET;//secret が存在し、かつ環境変数の REVALIDATE_SECRET と一致する場合に true を返す
}

type CMSObject = Record<string, unknown>;//microCMSのWebhookから取得するデータの型定義（キーはstring型で中身はunknown型）
type CMSContents = Record<string, unknown>;//microCMSのWebhookから取得するcontentsの型定義（キーはstring型で中身はunknown型）

type WebhookBody = {//microCMSのWebhookから取得するデータの型定義
  service?: string;
  api?: string; // "people" | "evaluations"
  type?: string; // "create" | "edit" | "delete"
  id?: string;
  contentId?: string; // 念のため
  contents?: CMSContents; // microCMS実Webhookはここに old/new が入る
};

//以下、microCMSからのデータを削除リストに仕分ける前段階としてPOST関数に渡す前の下処理関数

function isObj(v: unknown): v is Record<string, unknown> {//タイプガード関数：v＝unknown（何が来るかわからない）データを「これは中身があるオブジェクトだよ」とTypeScriptに教えるための関数
  return typeof v === "object" && v !== null;//vがオブジェクト型であり、かつnullではない場合にtrueを返す
}

/**
 * microCMS webhook の old/new（または "新規"）の中身は、
 * - 直接 公開データ（publishValue） を持つ場合
 * - { publishValue, draftValue } のラッパーの場合
 * があるので、公開データ（publishValue） があればそれを優先して返す
 */
function unwrapValue(node: unknown): CMSObject | undefined {//Webhookのold/new（または"新規"）の中身を取り出す関数
  if (!isObj(node)) return undefined;//nodeがオブジェクト型でない場合はundefinedを返す
  const publishValue = node["publishValue"];//nodeの中の公開データ（publishValue）を取り出す
  if (isObj(publishValue)) return publishValue;//publishValueがオブジェクト型であればそれを返す
  return node as CMSObject;//それ以外の場合はnode自体をCMSObject型として返す
}

function pickString(obj: CMSObject | undefined, key: string): string | undefined {//CMSObjectから特定のキーの文字列値を取り出す関数
  if (!obj) return undefined;//objがundefinedの場合はundefinedを返す
  const v = obj[key];//objから指定されたkeyの値を取り出す
  return typeof v === "string" ? v : undefined; //取り出した値が文字列型であればそれを返し、そうでなければundefinedを返す
}

function pickRefSlug(obj: CMSObject | undefined): string | undefined {//microCMSのevaluationの参照フィールド（person / 人）から slug を取り出す関数
  if (!obj) return undefined;//objがundefinedの場合はundefinedを返す


  const ref = obj["person"] ?? obj["人"]; // 英語フィールド名 "person" / 日本語フィールド名 "人" どっちでも拾う
  if (!isObj(ref)) return undefined;//refがオブジェクト型でない場合はundefinedを返す

  const slug = ref["slug"];//refからslugを取り出す
  return typeof slug === "string" ? slug : undefined;//取り出したslugが文字列型であればそれを返し、そうでなければundefinedを返す
}

function unique(arr: string[]) {//二度手間を防ぐために文字列の配列から重複を取り除く関数
  return Array.from(new Set(arr.filter(Boolean)));//arr配列から falsy な値（null, undefined, 空文字列など）を取り除き、Setを使って重複を排除し、最後にArray.fromで配列に戻して返す
}

async function parseBody(req: NextRequest): Promise<WebhookBody | null> {//Webhookのリクエストボディを解析するPOST関数の下請け関数
  try {
    return (await req.json()) as WebhookBody;//リクエストボディをJSONとして解析し、WebhookBody型として返す
  } catch {
    return null;
  }
}

// 以下、WebhookのPOST関数本体

export async function POST(req: NextRequest) {//WebhookのPOST関数
  if (!auth(req)) {//認証に失敗した場合(環境変数REVALIDATE_SECRET=秘密の鍵が間違っている場合)
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });//401 Unauthorized エラーを返す
  }

  const debug = req.nextUrl.searchParams.get("debug") === "1";//URLの?debug=1が指定されているかどうかを判定

  const body = await parseBody(req);//Webhookのリクエストボディを解析
  if (!body) {//解析に失敗した場合
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); //400 Bad Request エラーを返す
  }

  // microCMS実Webhook: contents.old / contents.new が基本。
  // 表示上 "新規" になってるケースもあるので両対応
  const contents = isObj(body.contents) ? body.contents : undefined;//body.contentsがオブジェクト型であればそれをcontentsに代入し、そうでなければundefinedを代入

  const rawOld = contents?.["old"];//Webhookのold/new（または"新規"）の中身を取得
  const rawNew = contents?.["new"] ?? contents?.["新規"]; //"新規"の場合もあるので対応

  const oldNode = unwrapValue(rawOld);//Webhookのold/new（または"新規"）の中身を取り出す
  const newNode = unwrapValue(rawNew);//Webhookのold/new（または"新規"）の中身を取り出す

  const api = body.api;//Webhookのapiフィールドを取得（"people" または "evaluations"）

  // 以下、古くなったキャッシュを削除するためのタグ・パスを決定していく

  // people: slug
  const newSlug = pickString(newNode, "slug");//newNode（新しいデータ）からslugを取り出す
  const oldSlug = pickString(oldNode, "slug");//oldNode（古いデータ）からslugを取り出す

  // evaluations: person参照からslug（または personSlug を残してる場合のフォールバック）
  const newPersonSlug = pickRefSlug(newNode) ?? pickString(newNode, "personSlug");//newNode（新しいデータ）の参照フィールド（person / 人）からslugを取り出し、なければpersonSlugを取り出す
  const oldPersonSlug = pickRefSlug(oldNode) ?? pickString(oldNode, "personSlug");//oldNode（古いデータ）の参照フィールド（person / 人）からslugを取り出し、なければpersonSlugを取り出す

  const tags: string[] = [];//revalidateTagで削除するタグを格納するためのリスト
  const paths: string[] = [];//revalidatePathで削除するパスを格納するためのリスト

  // ---- people版　ゴミ箱投げ込みリストの作成 ----
  if (api === "people") {//人物データが変わった場合
    tags.push("people");//peopleタグをリストに追加
    if (newSlug) tags.push(`people:${newSlug}`);//新しいslugが存在すればpeople:〇〇というタグをリストに追加
    if (oldSlug && oldSlug !== newSlug) tags.push(`people:${oldSlug}`);// 古いslugが存在し、かつ新しいslugと異なる場合はpeople:〇〇というタグをリストに追加
    paths.push("/");//トップページのパスを追加
    if (newSlug) paths.push(`/person/${newSlug}`);//新しいslugが存在すればその人物ページのパスをリストに追加
    if (oldSlug && oldSlug !== newSlug) paths.push(`/person/${oldSlug}`); //古いslugが存在し、かつ新しいslugと異なる場合はその人物ページのパスを追加
  }

  // ---- evaluations版　ゴミ箱投げ込みリストの作成----
  if (api === "evaluations") {//評価データが変わった場合
    tags.push("evaluations");//evaluationsタグをリストに追加
    tags.push("evaluations:latest");//evaluations:latestタグをリストに追加（トップページの評価一覧に影響するため）

    if (newPersonSlug) tags.push(`evaluations:${newPersonSlug}`);//新しい参照slugが存在すればevaluations:〇〇というタグをリストに追加
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug) {//古い参照slugが存在し、かつ新しい参照slugと異なる場合
      tags.push(`evaluations:${oldPersonSlug}`);//evaluations:〇〇というタグをリストに追加
    }

    paths.push("/");//個人ページのパスをリストに追加
    if (newPersonSlug) paths.push(`/person/${newPersonSlug}`);//新しい参照slugが存在すればその人物ページのパスをリストに追加
    if (oldPersonSlug && oldPersonSlug !== newPersonSlug) {//古い参照slugが存在し、かつ新しい参照slugと異なる場合
      paths.push(`/person/${oldPersonSlug}`);//その人物ページのパスをリストに追加
    }
  }

  // 保険：何かの通知が来たがそれが何かわからない場合、タグとパスを全部消す
  if (tags.length === 0) {//もしリストが空の場合（何も追加されなかった場合）
    tags.push("people", "evaluations", "evaluations:latest"); //people、evaluations、evaluations:latestタグをリストに追加
    paths.push("/");//トップページのパスをリストに追加
  }

  const uniqTags = unique(tags);//リストの中から同じ名前のタグを削除して1回にする
  const uniqPaths = unique(paths);//リストの中から同じパスを削除して1回にする

  // ゴミ箱投げ込みリストの全削除を実行

  for (const t of uniqTags) revalidateTag(t, "max");
  for (const p of uniqPaths) revalidatePath(p);

  const debugData = debug//処理がうまくいかなかった時、何が原因か突き止めるための詳細レポート
  //URLの末尾に &debug=1をwebhookにつけてアクセスした場合にdebugData の中身が表示され処理の中身がわかる
  //webhookの“中身がどういう形か” を見て、デバッグ情報（送信側がきちんと送れているか。受信したJSONのキーや person参照のslug等）をレスポンスに含めて返すPOST関数
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

  return NextResponse.json({//WebhookのPOST関数の最終的な戻り値とmicroCMSへの返事
    revalidated: true,
    api: body.api ?? null,
    type: body.type ?? null,
    contentId: body.contentId ?? body.id ?? null,
    tags: uniqTags,
    paths: uniqPaths,
    ...(debug ? { debug: debugData } : {}),
  });
}

export async function GET(req: NextRequest) {//このプログラムの生存確認用(疎通確認用)のGET関数（microCMSを更新し本番環境：https://evaluation-room.vercel.app/api/revalidate?secret=KazuKazu00441144orローカル開発中: http://localhost:3000/api/revalidate?secret=合言葉にアクセスするとok:trueとでる）
  if (!auth(req)) {                          //secret が合っているか,どのバージョンの route.ts がデプロイされているか,401じゃないか を確認するための関数（例えるとインターホンが繋がってるかの確認をキャッシュを消さずに行う）
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });//401 Unauthorized エラーを返す
  }
  return NextResponse.json({
    ok: true,
    version: "revalidate-v4-no-any",
    now: Date.now(),
  });
}

