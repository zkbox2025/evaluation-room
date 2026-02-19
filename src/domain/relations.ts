//# Like/Favorite など関係

import type { ViewerId, EvaluationContentId, PersonSlug } from "./entities";

export type EvaluationLike = {
  id: string; 
  viewerId: ViewerId;
  evaluationId: EvaluationContentId;
  createdAt: Date;
};

export type PersonFavorite = {
  id: string;  
  viewerId: ViewerId;
  personSlug: PersonSlug;
  createdAt: Date;
};