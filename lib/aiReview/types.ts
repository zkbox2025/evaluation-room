export type ReviewTarget = {
  type: "top" | "person" | "likes" | "favorites";
  key?: string | null; // person slug など
};