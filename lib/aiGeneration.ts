//AIとの会話のデータをDBに保存したり、特定の個人に対する最新のAIとの会話データを取得したり、特定の訪問者が行ったAIとの会話データの履歴を取得したりするための関数を定義するモジュール（バックエンド側）。
import { prisma } from "@/infrastructure/prisma/client";

type CreateAiGenerationInput = {//AI生成データをDBに保存するための関数createAiGenerationの引数の型定義
  viewerId: string;
  personSlug: string;
  prompt: string;
  resultText: string;
  model: string;
  status: "success" | "error";
  errorMessage?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsdMicro?: number;
};

export async function createAiGeneration(input: CreateAiGenerationInput) {
  return prisma.aiGeneration.create({//AIとの会話データをDBに保存する関数。引数はCreateAiGenerationInput型のinputオブジェクト。inputオブジェクトの各フィールドをDBの対応するカラムに保存する。
    data: {
      viewerId: input.viewerId,
      personSlug: input.personSlug,
      prompt: input.prompt,
      resultText: input.resultText,
      model: input.model,
      status: input.status,
      errorMessage: input.errorMessage,
      tokensInput: input.tokensInput,
      tokensOutput: input.tokensOutput,
      costUsdMicro: input.costUsdMicro,
    },
  });
}

export async function getLatestAiGenerationForPerson(viewerId: string, personSlug: string) {//特定の個人に対する最新のAI生成データを取得する関数。引数はviewerId（訪問者ID）とpersonSlug（個人ページのスラッグ）。DBからviewerIdとpersonSlugが一致するAI生成データを新しい順に1件だけ取る。
  return prisma.aiGeneration.findFirst({
    where: { viewerId, personSlug },//viewerIdとpersonSlugが同じであるAI生成データをDBから探す。
    orderBy: { createdAt: "desc" },//新しい順に並べて１件取得する。
  });
}

export async function getAiGenerationsByViewer(viewerId: string, take = 20) {//特定の訪問者が行ったAI生成データの履歴を取得する関数。引数はviewerId（訪問者ID）とtake（取得する件数、デフォルトは20）。DBからviewerIdが一致するAI生成データを新しい順に20件だけ取る。
  return prisma.aiGeneration.findMany({
    where: { viewerId },//viewerIdが同じであるAI生成データをDBから探す。
    orderBy: { createdAt: "desc" },///新しい順に並べる
    take,//指定された件数だけ取る(デフォルトは20件)
  });
}