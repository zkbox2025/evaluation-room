//サイトに来た人に背番号（Cookie）を渡し、データベースに登録する関数
import { cookies } from "next/headers";//クッキーを操作するための関数をインポート
import { prisma } from "@/lib/db";//データベースにアクセスするための道具をインポート

export async function getOrCreateViewer() {//viewer（訪問者）を取得するか、新しく作成する非同期関数
  const cookieStore = await cookies();//ブラウザに保存されているデータ（Cookie）を取り出す関数を呼び出す
  const  deviceId = cookieStore.get("deviceId")?.value;//deviceId（端末ID）という名前のクッキーの中身を取り出す

  if (!deviceId) {//deviceId（端末ID）がなければ新しく作成してクッキーに保存する
  return null;
    
  }

  const viewer =
    (await prisma.viewer.findUnique({ where: { deviceId } })) ??//データベースから同じ人を探して、
    (await prisma.viewer.create({ data: { deviceId } }));//なければデータベースに viewer（訪問者）を新規作成する

  return viewer;//viewer（訪問者）を返す
}

//クッキーはデータの保存場所（入れ物）でdeviceId（端末ID）はその中身（データ）