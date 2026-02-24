//お気に入りをつけたり外したりする際のsupabaseの書き換えとキャッシュ再検証を行うサーバーアクション関数
"use server";//ブラウザ（クライアント）ではなく、**Node.js側（サーバー）**で動く

import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(personSlug: string, pathToRevalidate: string) {//personSlugの人物をお気に入りにし、ページの更新を行う関数
  const viewer = await getOrCreateViewer();//viewerIDを特定
  if (!viewer) return;//viewerオブジェクト（viewerID入り）が取得できなければ何もしないで終了する

  const existing = await prisma.favorite.findUnique({//DBからviewerIDを検索して紐づいているお気に入り済みpersonslugを取得。
    where: { viewerId_personSlug: { viewerId: viewer.id, personSlug } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });//あったらお気に入り削除
  } else {
    await prisma.favorite.create({//お気に入りがなければ作成
      data: { viewerId: viewer.id, personSlug },
    });
  }

  revalidatePath(pathToRevalidate);//個人ページの更新
  revalidatePath("/favorites");//お気に入り一覧ページの更新
  revalidatePath("/"); //トップの更新
}
