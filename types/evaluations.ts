export type Evaluation = {
  id: string; 
  personSlug: string;
  from: string;
  date: string;       
  year: number;
  type: string;
  contentHtml: string; 
  isLiked?: boolean; // ★ これを追加（任意項目にする）
};
