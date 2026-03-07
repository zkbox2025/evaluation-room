//AIレビュー機能の『司令塔（メイン処理）』
"use server";

import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import type { ReviewTarget } from "@/lib/aiReview/types";
import type { ReviewSnapshot } from "@/lib/aiReview/snapshot";
import { buildReviewPrompt } from "@/lib/aiReview/prompt";
import { PROMPT_VERSION_INT, SCHEMA_VERSION_INT } from "@/lib/aiReview/versions";
import { ReviewV1Schema } from "@/lib/aiReview/reviewSchema";
import { callLLMReview } from "@/lib/aiReview/callLLM";

import {
  buildPersonReviewSnapshot,
  buildTopReviewSnapshot,
  buildLikesReviewSnapshot,
  buildFavoritesReviewSnapshot,
} from "@/lib/aiReview/snapshot";

import { getPerson, getPeople, groupPeopleByCategory } from "@/lib/getPerson";
import { getEvaluationsByPerson } from "@/lib/getEvaluationsByPerson";
import { getLatestEvaluations } from "@/lib/getLatestEvaluations";
import { getEvaluationsByIds } from "@/lib/getEvaluationsByIds";

import type { RunAiReviewResult } from "@/lib/aiReview/actionResult";
import type { Person } from "@/domain/entities";

export async function runAiReview(
  target: ReviewTarget,
  pathToRevalidate: string
): Promise<RunAiReviewResult> {
  const viewer = await getOrCreateViewer();
  if (!viewer) {
    // viewerが取れない = 実行不能（Cookie無効など）
    return { ok: false, code: "ERROR", message: "viewer not found (Cookieを有効にしてください)" };
  }

  const model = "gpt-4.1-mini";
  let snapshot: ReviewSnapshot | null = null;

  try {
    // 0) Rate limit（waitSec付き）
    const oneMinuteAgo = new Date(Date.now() - 60_000);

    const recent = await prisma.aiReview.findMany({
      where: { viewerId: viewer.id, createdAt: { gte: oneMinuteAgo } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    if (recent.length >= 3) {
      const oldest = recent[0]!.createdAt.getTime();
      const retryAt = oldest + 60_000;
      const waitSec = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
      throw new Error(`RATE_LIMIT:${waitSec}`);
    }

    // 1) snapshot生成
    if (target.type === "person") {
      const slug = target.key;
      if (!slug) throw new Error("person target requires key(personSlug)");

      const person = await getPerson(slug);
      if (!person) throw new Error("person not found");

      const evaluations = await getEvaluationsByPerson(slug);
      snapshot = buildPersonReviewSnapshot({ person, evaluations, takeLatest: 5 });
    } else if (target.type === "top") {
      const people = await getPeople();
      const grouped = groupPeopleByCategory(people);
      const latest = await getLatestEvaluations(5);

      snapshot = buildTopReviewSnapshot({
        people,
        grouped,
        latestEvaluations: latest,
        takeLatest: 5,
        takeTopPersonsPerCategory: 3,
      });
    } else if (target.type === "likes") {
      const likes = await prisma.like.findMany({
        where: { viewerId: viewer.id },
        select: { evaluationId: true },
        take: 50,
      });

      const ids = likes.map((l) => l.evaluationId);
      const evals = await getEvaluationsByIds(ids);

      snapshot = buildLikesReviewSnapshot({ evaluations: evals, takeLatest: 10 });
    } else if (target.type === "favorites") {
      const favs = await prisma.favorite.findMany({
        where: { viewerId: viewer.id },
        select: { personSlug: true },
        take: 50,
      });

      const slugs = favs.map((f) => f.personSlug);

      const isPerson = (p: Person | null): p is Person => p !== null;
      const people = (await Promise.all(slugs.map((s) => getPerson(s)))).filter(isPerson);

      snapshot = buildFavoritesReviewSnapshot({ people, takeLatest: 20 });
    } else {
      throw new Error("snapshot builder not implemented for target");
    }

    // 2) prompt生成
    const { system, user } = buildReviewPrompt({ target, snapshot });

    // 3) LLM呼び出し → JSON検証 → 保存（success）
    const llm = await callLLMReview({ system, user, model });
    const parsed = ReviewV1Schema.parse(llm.result);

    await prisma.aiReview.create({
      data: {
        viewerId: viewer.id,
        targetType: target.type,
        targetKey: target.key ?? null,
        inputSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        resultJson: parsed as unknown as Prisma.InputJsonValue,
        model,
        status: "success",
        errorMessage: null,
        promptVersion: PROMPT_VERSION_INT,
        schemaVersion: SCHEMA_VERSION_INT,
        tokensInput: llm.tokensInput ?? null,
        tokensOutput: llm.tokensOutput ?? null,
        costUsdMicro: llm.costUsdMicro ?? null,
      },
    });

    revalidatePath(pathToRevalidate);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // errorでも保存（snapshotが作れていれば一緒に残す）
    await prisma.aiReview.create({
      data: {
        viewerId: viewer.id,
        targetType: target.type,
        targetKey: target.key ?? null,
        inputSnapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        resultJson: Prisma.DbNull,
        model,
        status: "error",
        errorMessage: message,
        promptVersion: PROMPT_VERSION_INT,
        schemaVersion: SCHEMA_VERSION_INT,
      },
    });

    revalidatePath(pathToRevalidate);

    // UIが扱える形で返す
    if (message.startsWith("RATE_LIMIT:")) {
      const waitSec = Number(message.split(":")[1]);
      return {
        ok: false,
        code: "RATE_LIMIT",
        waitSec: Number.isFinite(waitSec) ? waitSec : 60,
        message: "レート制限中です。少し待ってください。",
      };
    }

    return { ok: false, code: "ERROR", message };
  }
}