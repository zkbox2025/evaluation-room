type Props = {
  params: {
    slug: string;
  };
};

const evaluations = [
  {
    slug: "tenshin",
    name: "那須川 天心",
    from: "山中 慎介",
    comment:
      "ボクシングでもすぐに世界王者になれるセンスがある。",
  },
  {
    slug: "fictional-person",
    name: "架空の人物",
    from: "恩師",
    comment:
      "君は、自分が思っているよりずっと遠くまで行ける。",
  },
  {
    slug: "myself",
    name: "あなた",
    from: "過去の自分",
    comment:
      "あの時諦めなかった判断は、間違っていなかった。",
  },
];

export default function EvaluationDetail({ params }: Props) {
  const evaluation = evaluations.find(
    (item) => item.slug === params.slug
  );

  if (!evaluation) {
    return <div>評価が見つかりません</div>;
  }

  return (
    <main className="min-h-screen bg-[#f6f4ee] flex items-center justify-center">
      <div className="max-w-2xl w-full px-8 py-20">
        <h1 className="text-3xl font-semibold text-gray-800">
          {evaluation.name} への評価
        </h1>

        <p className="mt-8 text-gray-700 leading-relaxed text-lg">
          {evaluation.comment}
        </p>

        <div className="mt-10 text-right text-sm text-gray-500">
          ― {evaluation.from}
        </div>
      </div>
    </main>
  );
}
