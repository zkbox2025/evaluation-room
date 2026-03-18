// src/lib/aiReview/save.ts
//DB保存のルールを1か所に集める(AIの実行結果を、成功・失敗を問わずログとしてDBに記録し、後から分析や再現ができるようにする)
import { prisma } from "@/infrastructure/prisma/client";
import { Prisma } from "@prisma/client";
import { PROMPT_VERSION_INT, SCHEMA_VERSION_INT } from "@/lib/aiReview/versions";
import type { ReviewTarget } from "@/domain/entities";
import type { ReviewSnapshot } from "@/lib/aiReview/snapshot";

type SaveAiReviewParams = {//保存するデータの型
  viewerId: string;
  target: ReviewTarget;
  snapshot: ReviewSnapshot | null;
  model: string;
  status: "success" | "error";
  resultJson?: unknown;
  errorMessage?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  costUsdMicro?: number | null;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {//unknown 型（何が入るか不明）を、PrismaがJSON列として受け入れられる型（InputJsonValue）に強制的にキャストする
  return value as Prisma.InputJsonValue;
}

export async function saveAiReview({
  //引数は以下の通り
  viewerId,
  target,
  snapshot,
  model,
  status,
  resultJson,
  errorMessage,
  tokensInput = null,
  tokensOutput = null,
  costUsdMicro = null,
}: SaveAiReviewParams) {
  return await prisma.aiReview.create({
    data: {
      viewerId,
      targetType: target.type,
      targetKey: target.type === "person" ? target.key : null,
      inputSnapshot: snapshot ? toInputJson(snapshot) : Prisma.DbNull,
      resultJson:
        status === "success" && resultJson !== undefined
          ? toInputJson(resultJson)
          : Prisma.DbNull,
      model,
      status,
      errorMessage: status === "error" ? (errorMessage ?? "unknown error") : null,
      promptVersion: PROMPT_VERSION_INT,
      schemaVersion: SCHEMA_VERSION_INT,
      tokensInput: status === "success" ? tokensInput : null,
      tokensOutput: status === "success" ? tokensOutput : null,
      costUsdMicro: status === "success" ? costUsdMicro : null,
    },
  });
}