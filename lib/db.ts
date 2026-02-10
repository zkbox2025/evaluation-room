//.ts や .tsx ファイルのコードを書き換えるたびにPrismaClient(電話回線)が新しく作らずに今あるものを使うための設定
import { PrismaClient } from "@prisma/client";

//globalThis は、再起動しても消えない「共通の倉庫」のような場所。そこに prisma という名前で道具を置いておけるように型を定義している
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =//prismaClientがすでにあればそれを使い、なければ新しく作る
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],//エラーと警告だけターミナルにメッセージを表示する
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;//本番環境（production）ではない時（＝開発中）だけ、倉庫に回線を保存しておく(本番環境では Next.js の挙動が異なるため、この使い回しテクニックは主に開発中のエラーを防ぐために使われる)
