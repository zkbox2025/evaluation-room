//いいねをつけたり外したりする際のsupabaseの書き換えとキャッシュ再検証を行うサーバーアクション

"use server";//サーバー側（https://evaluation-room.vercel.appなど）だけで動く特別な関数であることを示す特殊な指示
//ブラウザから直接データベースをいじるとセキュリティが危ないが、これなら「サーバーという安全な部屋」の中で安全にデータを書き換えられる。

import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { revalidatePath } from "next/cache";

export async function toggleLike(evaluationId: string, pathToRevalidate: string) {//評価にいいねをつけたり外したりする非同期関数
  const viewer = await getOrCreateViewer();//viewerオブジェクト（viewerID入り）を取得するか、新しく作成する関数を呼び出す

  if (!viewer) return;//viewerオブジェクト（viewerID入り）が取得できなければ何もしないで終了する

  const existing = await prisma.like.findUnique({//すでにいいねがあるかどうかをデータベースから探す
    where: { viewerId_evaluationId: { viewerId: viewer.id, evaluationId } },//viewerId（訪問者ID）と evaluationId（評価ID）を組み合わせた複合ユニークキーで検索する
  });

  if (existing) {//すでにいいねがあれば削除する
    await prisma.like.delete({ where: { id: existing.id } });//いいねを削除する
  } else { //すでにいいねがなければ新しく作る
    await prisma.like.create({//そうでなければいいねを新規作成する
      data: { viewerId: viewer.id, evaluationId },//viewerId（訪問者ID）と evaluationId（評価ID）をデータベースに保存する
    });
  }

  // 表示更新したいページを再検証
  revalidatePath(pathToRevalidate);//いいねをつけたり外したりした後に、revalidatePathがPersonpage関数を呼び最新の状態にする（ブラウザへの届け方が普通のアクセスとは違う：変更が必要な「部品のデータ」だけダウンロードし今の画面を維持したまま	変更部分だけ変わる）
  //ボタンを押した瞬間に、画面上の「いいね数」などが最新の状態にパッと切り替わるようになる（ページの再読み込みがない）
}
