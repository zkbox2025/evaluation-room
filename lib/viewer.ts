//サイトに来た人に背番号（Cookie）を渡し、データベースに登録する関数
import { cookies } from "next/headers";//クッキーを操作するための関数をインポート
import { prisma } from "@/lib/db";//データベースにアクセスするための道具をインポート
import { randomUUID } from "crypto";//ランダムなUUIDを生成するための関数をインポート

export async function getOrCreateViewer() {//viewer（訪問者）を取得するか、新しく作成する非同期関数
  const cookieStore = await cookies();//ブラウザに保存されているデータ（Cookie）を取り出す関数を呼び出す
  let deviceId = cookieStore.get("deviceId")?.value;//deviceId（端末ID）という項目がなくても、エラーにならず undefined を返す

  if (!deviceId) {//deviceId（端末ID）がなければ新しく作る
    deviceId = randomUUID();//ランダムなUUIDを生成して deviceId（端末ID）に代入する
    cookieStore.set("deviceId", deviceId, {//ブラウザに deviceId（端末ID）を保存する
      httpOnly: true,//このクッキーはJavaScriptから盗まれないようにする
      sameSite: "lax",//（CSRF）対策：同一サイトからのアクセスのみ有効にする
      path: "/",//サイト全体で有効にする
    });
  }

  const viewer =
    (await prisma.viewer.findUnique({ where: { deviceId } })) ??//データベースから同じ人を探して、
    (await prisma.viewer.create({ data: { deviceId } }));//なければデータベースに viewer（訪問者）を新規作成する

  return viewer;//viewer（訪問者）を返す
}

//クッキーはデータの保存場所（入れ物）でdeviceId（端末ID）はその中身（データ）