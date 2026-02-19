"use server";

import { prisma } from "@/infrastructure/prisma/client";
import { getOrCreateViewer } from "@/lib/viewer";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(personSlug: string, pathToRevalidate: string) {
  const viewer = await getOrCreateViewer();
  if (!viewer) return;

  const existing = await prisma.favorite.findUnique({
    where: { viewerId_personSlug: { viewerId: viewer.id, personSlug } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: { viewerId: viewer.id, personSlug },
    });
  }

  revalidatePath(pathToRevalidate);
  revalidatePath("/favorites");
  revalidatePath("/"); // ★ 追加：トップも更新
}
