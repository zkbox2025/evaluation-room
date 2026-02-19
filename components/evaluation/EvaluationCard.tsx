import type { Evaluation } from "@/domain/entities";///types/evaluationsからEvaluationの型だけをここで使えるように持ってきて！
import { LikeButton } from "./LikeButton";//いいねボタンのコンポーネント（UIの部品）およびプロパティ（色や形の指示書）に関する関数を呼び出す



type Props = Evaluation;//評価カードのコンポーネント（UIの部品）のプロパティ（色や形の指示書）の型を定義する


//評価カードのコンポーネント（UIの部品）およびプロパティに関する関数
export function EvaluationCard({ id, contentHtml, from, isLiked = false }: Props) {
  return (
    <article className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div
        className="prose prose-neutral max-w-none ..."//評価の内容をHTMLのまま表示するための要素を定義する
        dangerouslySetInnerHTML={{ __html: contentHtml }}//HTMLをそのまま挿入するための特別な属性
      />
      
      <div className="flex items-center justify-between mt-4">
        {/* ★ ここにボタンを配置 */}
        <LikeButton evaluationId={id} initialIsLiked={isLiked} />
        
        <p className="text-right text-sm text-gray-500">― {from}</p>
      </div>
    </article>
  );
}
