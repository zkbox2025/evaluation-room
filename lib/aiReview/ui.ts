// src/lib/aiReview/ui.ts
export function formatTargetLabel(targetType: string, targetKey?: string | null) {
  if (targetType === "person") return `person/${targetKey ?? ""}`;
  return targetType;
}

export function extractReviewBits(resultJson: unknown): {
  summary?: string;
  scores?: Record<string, number>;
  issuesTop3?: Array<{ severity: string; title: string }>;
} {
  if (!resultJson || typeof resultJson !== "object") return {};

  const obj = resultJson as Record<string, unknown>;

  const summary =
    typeof obj.summary === "string" ? obj.summary : undefined;

  const scores =
    obj.scores && typeof obj.scores === "object"
      ? (obj.scores as Record<string, number>)
      : undefined;

  const issuesTop3 =
    Array.isArray(obj.issues)
      ? obj.issues.slice(0, 3).map((i) => {
          if (!i || typeof i !== "object") {
            return { severity: "", title: "" };
          }

          const issue = i as Record<string, unknown>;

          return {
            severity: typeof issue.severity === "string" ? issue.severity : "",
            title: typeof issue.title === "string" ? issue.title : "",
          };
        })
      : undefined;

  return { summary, scores, issuesTop3 };
}