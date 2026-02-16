

//表示整形に関する関数をまとめるファイル

//date が不正なら元の文字列を返す（表示用）
export function formatDateLabel(dateStr: string): string {//dateStrをDateオブジェクトに変換して、変換できない場合は元の文字列を返す
  const d = new Date(dateStr);//日付文字列をDateオブジェクトに変換
  if (Number.isNaN(d.getTime())) return dateStr;//日付として無効な文字列ならそのまま返す
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });//有効な日付なら日本語の年月日形式で返す
}
