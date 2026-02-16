//# Like/Favorite など関係

import type { ViewerId, EvaluationContentId, PersonSlug } from "./entities";

export type EvaluationLike = {
  viewerId: ViewerId;
  evaluationId: EvaluationContentId;
  createdAt: Date;
};

export type PersonFavorite = {
  viewerId: ViewerId;
  personSlug: PersonSlug;
  createdAt: Date;
};