import { getPerson } from "@/lib/getPerson";//microCMSから人物データを取得する関数をインポート
import { getEvaluationsByPerson } from "@/lib/getEvaluationsByPerson";//microCMSからその人物に関する評価データを取得する関数をインポート
import EvaluationTimeline from "@/components/evaluation/EvaluationTimeline";//評価タイムラインコンポーネントをインポート
// ★ 追加：データベースと閲覧者を特定するための道具をインポート
import { prisma } from "@/lib/db";//設計図(schema.prisma)を書き換える際に使うprismaClient（電話回線）がすでにあればそれを使い、なければ新しく作る関数を公開
import { getOrCreateViewer } from "@/lib/viewer";//viewer（訪問者）を取得するか、新しく作成する関数をインポート

type Props = {//ページコンポーネントのプロパティの型を定義する
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";//このページは常に最新の情報を表示する（毎回DBを見に行く）設定だから事前に組み立てなくていいよという指示

export default async function PersonPage({ params }: Props) {//人物の詳細ページコンポーネントの非同期関数を公開
  const { slug } = await params;//params（URL）からslugを取り出す

  // 1. microCMSからデータをお取り寄せ
  const person = await getPerson(slug);
  const evaluations = await getEvaluationsByPerson(slug);

  if (!person) return <p>人物が見つかりません</p>;

  // 2. ★ 閲覧者を特定し、その人が「いいね」したデータ入りのリストをDBから取得（いいね済みの配列が入った評価ID（箱）を返す）
  const viewer = await getOrCreateViewer();
  const userLikes = await prisma.like.findMany({//viewerId（訪問者ID）を使って、その人が「いいね」した評価データのリストをデータベースから取得
    where: { viewerId: viewer.id },//viewerId（訪問者ID）で絞り込み
    select: { evaluationId: true }, //評価IDという箱（配列入り）だけを取得
  });

  // 3. ★ 「いいね済みID」を使いやすいように整理する（配列から一瞬で「いいね済み」を判定するための「お掃除」作業）
  const likedIds = new Set(userLikes.map((l) => l.evaluationId));//DBから取得したリストからいいね済み評価IDだけを取り出して集める

  // 4. ★ microCMSのデータに「いいね済み」の印（isLiked）を合体させる（あらかじめ全データに isLiked: true/false というラベルを貼っておけば、カード側は何も考えず即判断できる）
  const evaluationsWithLikeStatus = evaluations.map((e) => ({//microCMSから取得した評価データを1つずつ取り出して新しい形に変換する
    ...e,//元の評価データを展開
    isLiked: likedIds.has(e.id), //その評価IDがlikedIds（いいね済みIDの集合）に含まれているかどうかをチェックしてisLikedにセット
  }));

  return (
    <main className="max-w-3xl mx-auto py-20 px-6">{/*批評家者の名前のプロパティ*/}
      <h1 className="text-4xl font-bold">{person.name}</h1>{/*批評家者の通称のプロパティ*/}
      <p className="mt-4 text-gray-600 leading-relaxed">{person.description}</p>{/*最新順に並んだ評価（いいね印付き）のプロパティ*/}

      {/* 5. ★ 合体させた新しいデータを渡す */}
      <EvaluationTimeline evaluations={evaluationsWithLikeStatus} />
    </main>
  );
}
