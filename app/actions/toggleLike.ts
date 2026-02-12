//いいねをつけたり外したりする関数

"use server";//サーバー側（https://evaluation-room.vercel.appなど）だけで動く特別な関数であることを示す特殊な指示
//ブラウザから直接データベースをいじるとセキュリティが危ないが、これなら「サーバーという安全な部屋」の中で安全にデータを書き換えられる。

import { prisma } from "@/lib/db";
import { getOrCreateViewer } from "@/lib/viewer";
import { revalidatePath } from "next/cache";

export async function toggleLike(evaluationId: string, pathToRevalidate: string) {//評価にいいねをつけたり外したりする非同期関数
  const viewer = await getOrCreateViewer();//viewer（訪問者）を取得するか、新しく作成する関数を呼び出す

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
  revalidatePath(pathToRevalidate);//いいねをつけたり外したりした後に、pathToRevalidate（再検証するパス）で指定されたページを再検証して表示を更新する
  //ボタンを押した瞬間に、画面上の「いいね数」などが最新の状態にパッと切り替わるようになる（これもサーバーコンポーネントの強みの一つ）
}
