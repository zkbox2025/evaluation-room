//表示整形に関する関数をまとめるファイル
import { clampText } from "@/domain/rules";
import truncateHtml from "truncate-html";

export function htmlToText(html: string): string {// HTMLタグを消去して「ただの文字」にする関数
  return html.replace(/<[^>]+>/g, "").trim();
}
//パターン①サイドバーで文字制限（表示を文字列）
export function truncateToPlainText(html: string, max = 80): string {//HTMLを文字数制限付き(80文字)の文字列に変換する関数（サイドバーなどで文字数が限られる場合に使用（HTMLがいらない文章）
  return clampText(htmlToText(html), max);//htmlToTextでHTMLタグを消去して、clampTextで文字切りを行う
}
//パターン②トップページのメイン（最新評価）で文字制限（表示をHTML）
export function clipHtml(html: string, max = 100): string {//HTMLを文字数制限付き（100文字）のHTMLに変換する（最新評価５件などをHTMLで表示したい場合に使用）
  return truncateHtml(html, max, { byWords: false });
}

//date が不正なら元の文字列を返す（表示用）
export function formatDateLabel(dateStr: string): string {//dateStrをDateオブジェクトに変換して、変換できない場合は元の文字列を返す
  const d = new Date(dateStr);//日付文字列をDateオブジェクトに変換
  if (Number.isNaN(d.getTime())) return dateStr;//日付として無効な文字列ならそのまま返す
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });//有効な日付なら日本語の年月日形式で返す
}
