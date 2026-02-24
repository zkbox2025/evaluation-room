//特定人物の評価データを入れることで年号（文字列）をキーにした、評価データの配列の辞書を返す関数のファイル
//「ただの評価リスト」を「年次別の構成」に組み替えるための下準備をする
import type { Evaluation } from "@/domain/entities";

export function groupEvaluationsByYear(//特定人物の評価データを入れることで年号（文字列）をキーにした、評価データの配列の辞書を返す関数
  evaluations: Evaluation[]
): Record<string, Evaluation[]> {
  return evaluations.reduce((acc, evaluation) => {//acc（＝年別の棚）に一つずつ評価データを入れていく
    const year = String(evaluation.year);//一つずつ評価データの年を確認
    (acc[year] ??= []).push(evaluation);//一つずつ評価データを年の棚に入れる
    return acc;
  }, {} as Record<string, Evaluation[]>);//年号（文字列）をキーにした、評価データの配列の辞書を返す

}
