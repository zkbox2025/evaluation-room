"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/toggleFavorite";
import { usePathname } from "next/navigation";

type Props = {
  personSlug: string;
  initialIsFavorited: boolean;
};

export function FavoriteButton({ personSlug, initialIsFavorited }: Props) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);

  return (
    <button
      disabled={isPending}
      onClick={() => {
        setIsFavorited((v) => !v);

        startTransition(async () => {
          await toggleFavorite(personSlug, pathname);
        });
      }}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isFavorited
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isPending ? "..." : isFavorited ? "★ お気に入り" : "☆ お気に入り"}
    </button>
  );
}
