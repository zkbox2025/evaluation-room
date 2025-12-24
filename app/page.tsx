const evaluations = [
  {
    id: 1,
    slug: "tenshin",
    name: "那須川 天心",
    from: "山中 慎介",
    comment:
      "ボクシングでもすぐに世界王者になれるセンスがある。",
  },
  {
    id: 2,
    slug: "fictional-person",
    name: "架空の人物",
    from: "恩師",
    comment:
      "君は、自分が思っているよりずっと遠くまで行ける。",
  },
  {
    id: 3,
    slug: "myself",
    name: "あなた",
    from: "過去の自分",
    comment:
      "あの時諦めなかった判断は、間違っていなかった。",
  },
];

import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4ee] flex items-center justify-center">
      <div className="max-w-3xl w-full px-8 py-20">
        <h1 className="text-4xl font-semibold text-gray-800 text-center tracking-wide">
          評価の部屋
        </h1>

        <div className="mt-16 space-y-8">
          {evaluations.map((item) => (
            <Link key={item.id} 
            href={`/evaluation/${item.slug}`}>
            <div className="bg-white rounded-xl p-6 shadow-sm"
            >
              <p className="text-gray-700 leading-relaxed">
                {item.comment}
              </p>

              <div className="mt-4 text-sm text-gray-500 text-right">
                ― {item.from}
              </div>

              <div className="mt-1 text-xs text-gray-400 text-right">
                （{item.name}）
              </div>
            </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
