// lib/viewer.ts
import { cookies } from "next/headers";
import { prisma } from "@/infrastructure/prisma/client";

export async function getOrCreateViewer() {//deviceIDを基にviewer（訪問者）を取得するか、なければ新しく作成する関数を公開
  const cookieStore = await cookies();//クッキーの入れ物を開ける
  const deviceId = cookieStore.get("deviceId")?.value;//クッキーの中からdeviceId（端末ID）を取り出す

  // deviceIdがない場合は、Middlewareがまだ動いていないか、Cookieが無効。
  // ここでCookieをセットしようとするとエラーになるので、単にnullを返す。
  if (!deviceId){
    console.warn("⚠️ [Viewer] No deviceId found in cookies"); // ログ: Cookieがない時
    
    return null;
    }

  try {
    // まずDBから探す
    let viewer = await prisma.viewer.findUnique({// deviceIdを使ってviewerオブジェクト（viewerID入り）をデータベース（supabase）から探す
      where: { deviceId },//deviceId（端末ID）で絞り込み
    });

    // なければviewerオブジェクト（viewerID入り）を作成する（DBへの作成自体はページ内でも許可されています）
    if (!viewer) {
      viewer = await prisma.viewer.create({
        data: { deviceId },
      });
    }

    return viewer;//viewerオブジェクト（viewerID入り）を返す
  } catch (error) {
    // 🔴 ここが重要！DB接続エラーなどを捕まえてログに出す
    console.error("Database error in getOrCreateViewer:", error);
    return null;
  }
}


//クッキーはデータの保存場所（入れ物）でdeviceId（端末ID）はその中身（データ）