// lib/viewer.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function getOrCreateViewer() {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get("deviceId")?.value;

  // deviceIdがない場合は、Middlewareがまだ動いていないか、Cookieが無効。
  // ここでCookieをセットしようとするとエラーになるので、単にnullを返す。
  if (!deviceId){
    console.warn("⚠️ [Viewer] No deviceId found in cookies"); // ログ: Cookieがない時
    
    return null;
    }

  try {
    // まずDBから探す
    let viewer = await prisma.viewer.findUnique({
      where: { deviceId },
    });

    // なければ作成する（DBへの作成自体はページ内でも許可されています）
    if (!viewer) {
      viewer = await prisma.viewer.create({
        data: { deviceId },
      });
    }

    return viewer;
  } catch (error) {
    // 🔴 ここが重要！DB接続エラーなどを捕まえてログに出す
    console.error("Database error in getOrCreateViewer:", error);
    return null;
  }
}


//クッキーはデータの保存場所（入れ物）でdeviceId（端末ID）はその中身（データ）