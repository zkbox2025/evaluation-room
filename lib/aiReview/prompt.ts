// AIに渡す注文書
import { PROMPT_VERSION, JSON_SCHEMA_VERSION } from "./versions";
import type { ReviewTarget } from "./types";
import type { ReviewSnapshot } from "./snapshot";

export function buildReviewPrompt(args: {
  target: ReviewTarget;
  snapshot: ReviewSnapshot;
}) {
  const { target, snapshot } = args;

  const system = [
    "You are a strict UX/UI reviewer for a Japanese web app.",
    "Return ONLY valid JSON (no markdown, no code fences).",
    `The JSON must include promptVersion="${PROMPT_VERSION}".`,
    `The JSON must match schemaVersion="${JSON_SCHEMA_VERSION}".`,
    "Scores are integers 0-10.",
    "Write Japanese text for summary/goodPoints/issues/nextActions.",
  ].join("\n");

  const user = JSON.stringify(
    {
      instruction: "以下のsnapshotをレビューして、指定のJSON形式で返してください。",
      meta: {
        promptVersion: PROMPT_VERSION,
        schemaVersion: JSON_SCHEMA_VERSION,
      },
      target: { type: target.type, key: target.key ?? null },
      snapshot,
      outputFormat: {
        promptVersion: PROMPT_VERSION,
        schemaVersion: JSON_SCHEMA_VERSION,
        target: { type: target.type, key: target.key ?? null },
        scores: {
          ux: 0,
          ui: 0,
          performance: 0,
          accessibility: 0,
          codeQuality: 0,
        },
        summary: "string",
        goodPoints: ["string"],
        issues: [
          {
            severity: "high|medium|low",
            title: "string",
            detail: "string",
            fix: "string",
          },
        ],
        nextActions: ["string"],
      },
    },
    null,
    2
  );

  return { system, user };
}