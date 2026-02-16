// 正規化・制約に関するルール（kind, from, category など）


/** 評価の種類（アプリ内の正規化された値） */
export const EVALUATION_KINDS = ["quote", "work", "personality"] as const;
export type EvaluationKind = (typeof EVALUATION_KINDS)[number];



/**
 * ① kind を許可リストに正規化する(microCMSから来た e.type がどんな文字でも、アプリ内ではこの3つのどれかに丸める（正規化する）ということ)
 * - microCMSの自由入力や表記揺れを吸収する
 */
export function normalizeKind(raw?: string): EvaluationKind {//rawを小文字にして前後の空白を削除したものをsに代入する。もしrawがundefinedやnullの場合は空文字列を代わりに使う
  const s = (raw ?? "").trim().toLowerCase();//sがEVALUATION_KINDSの中に含まれていればsをEvaluationKind型として返す。そうでなければ"quote"を返す
  if ((EVALUATION_KINDS as readonly string[]).includes(s)) {//EVALUATION_KINDSを文字列の配列として扱い、sがその中に含まれているかをチェックする
    return s as EvaluationKind;//sをEvaluationKind型として返す（sはEVALUATION_KINDSの中にあることが保証されているため）
  }
  return "quote";//sがEVALUATION_KINDSの中にない場合は、デフォルトで"quote"を返す（このルールは必要に応じて変更してOK）
}

/**
 * ② from が空なら "不明" にする
 */
export function normalizeFrom(raw?: string): string {
  const s = (raw ?? "").trim();
  return s ? s : "不明";
}

/**
 * ③ category が空なら "未分類" にする（名前の正規化）
 */
export function normalizeCategoryName(raw?: string): string {//rawを前後の空白を削除したものをsに代入する。もしrawがundefinedやnullの場合は空文字列を代わりに使う
  const s = (raw ?? "").trim();
  return s ? s : "未分類";//sが空文字でなければsを返し、そうでなければ"未分類"を返す

}

// ④ category表示名 -> URL用slug（簡易）
// microCMS側でカテゴリslugを持てるならそれを優先するのが理想（今は無い前提）
export function slugifyCategoryName(categoryName: string): string {//カテゴリー名からURL用のスラッグに形式を変換する関数
  const s = categoryName.trim();//前後の空白を削除してsに代入する
  if (!s) return "uncategorized";//sが空文字なら"uncategorized"を返す

  // 日本語でも壊れない範囲で最低限
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "");
}




/**
 * ⑤ contentHtml の最大長（表示用の安全策）
 * - 長文でUIが崩れるのを防ぐ
 * - 本当に必要になったら使えばOK（今は未使用でも良い）
 */
export function clampText(text: string, max: number): string {//textをmax文字に切り詰める関数。textがmax文字以下ならそのまま返し、そうでなければmax文字目までを切り取って末尾に"…"をつけて返す
  if (text.length <= max) return text;//textがmax文字以下ならそのまま返す
  return text.slice(0, max) + "…";//textがmax文字を超える場合は、textの先頭からmax文字目までを切り取って末尾に"…"をつけて返す
}
