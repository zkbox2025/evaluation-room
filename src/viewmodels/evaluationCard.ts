// src/viewmodels/evaluationCard.ts
//EvaluationCardVMの型定義

import type { EvaluationContentId, PersonSlug } from "@/domain/entities";

export type EvaluationCardVM = {
  id: EvaluationContentId;
  subject: {
    slug: PersonSlug;
    name: string;
    categoryName: string;
  };
  from: string;
  dateLabel: string;
  kind: string;
  contentHtml: string;
  isLiked: boolean;
  isFavorited: boolean;
};
