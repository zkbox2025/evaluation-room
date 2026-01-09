export type Evaluation = {
  id: string;
  personSlug: string;
  contentHtml: string;
  from: string;
  date: string;
  year: number;                 
  type: "quote" | "card";
};
