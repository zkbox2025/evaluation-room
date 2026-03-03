//個別ページファイル
import Link from "next/link";
import { getPerson } from "@/lib/getPerson";//microCMSから人物データを取得する関数をインポート
import { getEvaluationsByPerson } from "@/lib/getEvaluationsByPerson";//microCMSからその人物に関する評価データを取得する関数をインポート
import EvaluationTimeline from "@/components/evaluation/EvaluationTimeline";//評価タイムラインコンポーネントをインポート
// ★ 追加：データベースと閲覧者を特定するための道具をインポート
import { prisma } from "@/infrastructure/prisma/client";//設計図(schema.prisma)を書き換える際に使うprismaClient（電話回線）がすでにあればそれを使い、なければ新しく作る関数を公開
import { getOrCreateViewer } from "@/lib/viewer";//viewer（訪問者）を取得するか、新しく作成する関数をインポート
import { FavoriteButton } from "@/components/person/FavoriteButton";//お気に入りボタンをインポート
import { SaveDummyAiButton } from "@/components/ai/SaveDummyAiButton";
import { getLatestAiGenerationForPerson } from "@/lib/aiGeneration";

type Props = {//ページコンポーネントのプロパティの型を定義する
  params: Promise<{ slug: string }>;//このページはURLにslugを持つルート（例 /person/tanaka（←params））で、slugを使って人物を特定する
};

export default async function PersonPage({ params }: Props) {//人物の詳細ページコンポーネントの非同期関数を公開
  const { slug } = await params;//params（URL）が届いてからslugを取り出す

  // 1. microCMSからデータをお取り寄せ
  const person = await getPerson(slug);//slugで人物情報を取得
  const evaluations = await getEvaluationsByPerson(slug);//slugでその人物の評価を取得

  if (!person) return <p>人物が見つかりません</p>;//personがnull/undefinedなら表示して終了

  // 2. ★ deviceIDを使ってviewerオブジェクト（viewerID入り）を取得し閲覧者を特定する関数を呼び出す（なければ新規で作る）
  const viewer = await getOrCreateViewer();

  // ★ 追加：もしviewerオブジェクトが取得できなかったら（初回アクセス時など）表示して終了
  if (!viewer) {
  return <p>読み込み中、またはCookieを有効にしてください。</p>;
  }

  const latestAiGeneration = viewer
  ? await getLatestAiGenerationForPerson(viewer.id, slug)
  : null;

  const userLikes = await prisma.like.findMany({//viewerIdを使って、その人が「いいね」した評価データのリストをデータベース(supabase)から取得（いいね済みの配列が入った評価ID（箱）を返す） 例）{ evaluationId: "id-1" }, { evaluationId: "id-2" },
    where: { viewerId: viewer.id },//viewerIdで絞り込み
    select: { evaluationId: true }, //評価IDという箱（配列入り）だけを取得
  });
  

  // 3. ★ 「いいね済みID」を使いやすいように整理する（配列から一瞬で「いいね済み」を判定するための「お掃除」作業） 例）["id-1", "id-2"]
  const likedIds = new Set(userLikes.map((l) => l.evaluationId));//DBから取得したリストからいいね済み評価IDだけを取り出して集める

// 4) ★ Favorite取得（このviewerがお気に入りしたpersonSlug一覧）  例）{ personSlug: "slug-1" }, { personSlug: "slug-2" },
  const userFavorites = await prisma.favorite.findMany({
    where: { viewerId: viewer.id },
    select: { personSlug: true },
  });
  const favoritedSlugs = new Set(userFavorites.map((f) => f.personSlug));//DBから取得したリストからお気に入りPersonslugだけを取り出して集める　例）["slug-1", "slug-2"]
  const isFavorited = favoritedSlugs.has(slug);//開いてるページのslugがSetリストの中にあるかを判定する


  // 5. ★ microCMSの評価データに「いいね済み」のラベルを貼る（あらかじめ全データに isLiked: true/false というラベルを貼っておけば、カード側は何も考えず即判断できる）（データにislikedのプロパティを追加するのではなくラベルを貼る）
  const evaluationsWithLikeStatus = evaluations.map((e) => ({//microCMSから取得した評価データを1つずつ取り出して新しい形に変換する
    ...e,//microCMSから取得した評価データを展開
    isLiked: likedIds.has(e.id), //その評価IDがlikedIds（いいね済みIDの集合）に含まれているかどうかをチェックしてラベルを貼る
  }));


return (
  <main className="max-w-3xl mx-auto py-20 px-6">
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-4xl font-bold">{person.name}</h1>
      <FavoriteButton personSlug={slug} initialIsFavorited={isFavorited} />
    </div>

    <p className="mt-4 text-gray-600 leading-relaxed">{person.description}</p>
    <SaveDummyAiButton personSlug={slug} />
    <EvaluationTimeline evaluations={evaluationsWithLikeStatus} />
    {latestAiGeneration && (
  <div className="mt-6 rounded-xl bg-white p-4 border border-gray-100">
    <p className="text-xs text-gray-500">
      前回のAI生成（{new Date(latestAiGeneration.createdAt).toLocaleString("ja-JP")}）
    </p>

    {latestAiGeneration.status === "success" ? (
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
        {latestAiGeneration.resultText}
      </p>
    ) : (
      <div className="mt-2">
        <p className="text-sm text-red-600 font-medium">生成に失敗しました</p>
        {latestAiGeneration.errorMessage && (
          <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
            {latestAiGeneration.errorMessage}
          </p>
        )}
      </div>
    )}

    <p className="mt-2 text-xs text-gray-400">
      model: {latestAiGeneration.model} / status: {latestAiGeneration.status}
    </p>
  </div>
)}
    <Link className="inline-block mt-10 text-blue-600 underline" href="/">
        トップへ戻る
      </Link>
  </main>
);
}