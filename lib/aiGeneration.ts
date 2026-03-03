import { prisma } from "@/infrastructure/prisma/client";

type CreateAiGenerationInput = {
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
  return prisma.aiGeneration.create({
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

export async function getLatestAiGenerationForPerson(viewerId: string, personSlug: string) {
  return prisma.aiGeneration.findFirst({
    where: { viewerId, personSlug },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAiGenerationsByViewer(viewerId: string, take = 20) {
  return prisma.aiGeneration.findMany({
    where: { viewerId },
    orderBy: { createdAt: "desc" },
    take,
  });
}