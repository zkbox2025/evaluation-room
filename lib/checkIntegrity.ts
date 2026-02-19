//checkIntegrity.ts　microCMSのデータが壊れてないかの点検する関数
import { microcms } from "@/infrastructure/microcms/client";//src/infrastructure/microcms/client.tsからmicrosmsだけをここで使えるように持ってきて！
import type { PersonCMS, EvaluationCMS } from "@/infrastructure/microcms/types";


async function fetchAll<T>(endpoint: string): Promise<T[]> {//データを全部取ってくるまで繰り返す処理
  const all: T[] = [];//最終的に返すための空の配列
  const LIMIT = 100;
  let offset = 0;

  while (true) {//中身が100件未満になるまで、offset（読み込み開始位置）をずらしながら何度も microCMS にデータを取りに行く
    const data = await microcms.getList<T>({
      endpoint,
      queries: { limit: LIMIT, offset },
    });

    all.push(...data.contents);//取得した中身をランダムにallの中に詰め込む

    if (data.contents.length < LIMIT) break;//もしLIMITまで行かずに全部取り終えたら終わり
    offset += LIMIT;//
  }

  return all;
}

function pickRefId(person: EvaluationCMS["person"]): string | undefined {//evaluationのperson参照からIDを取り出す関数
  // person は { id: string, slug: string } のはずなので、id を取るだけでOK
  return person?.id;
}

export async function checkCMSIntegrity() {//microCMSのデータが壊れてないかチェックを行う関数
  const people = await fetchAll<PersonCMS>("people");//peopleエンドポイントから全員分の人物データを取得
  const evaluations = await fetchAll<EvaluationCMS>("evaluations");//evaluationsエンドポイントから全ての評価データを取得

  const peopleIdSet = new Set(people.map((p) => p.id));//peopleのID一覧をSetにして高速検索できるようにする
  

  // チェック項目一覧
  

  // ① people の slug 重複チェック（事故りやすい）
  const slugCount = new Map<string, number>();//スラッグ（URLの名前）とそれが何回出たかを数えるslugCountマップ
  for (const p of people) slugCount.set(p.slug, (slugCount.get(p.slug) ?? 0) + 1);//peopleの中身を一つずつ見ていき、slugがあればslugCountマップにカウントを1増やし、なければ0から始めて1にする
  const duplicatePeopleSlugs = Array.from(slugCount.entries())//slugCountマップの中身を配列に変換し、
    .filter(([, c]) => c >= 2)//その中でカウントが2回以上のものだけを抽出し、
    .map(([slug, count]) => ({ slug, count }));//最終的にslugとcountのオブジェクトの配列として返す

  // ② evaluations -> person 参照が壊れてないか（最重要）
  const missingPersonRefs: Array<{//参照が壊れている評価データのリスト
    evaluationId: string;
    personId?: string;
    from?: string;
    date?: string;
  }> = [];//空の配列を用意

  for (const e of evaluations) {//evaluationsの中身を一つずつ見ていき
    const personId = pickRefId(e.person);//evaluationのperson参照からIDを取り出し
    if (!personId || !peopleIdSet.has(personId)) {//もしpersonIdが存在しない、またはpeopleIdSetにそのIDが存在しない場合は
      missingPersonRefs.push({//参照が壊れている評価データのリストに追加
        evaluationId: e.id,
        personId,
        from: e.from,
        date: e.date,
      });
    }
  }

  // ③ ついでに: people の slug のフォーマット（軽いバリデーション：正しい型かどうか検証すること）
  const invalidPeopleSlugs = people//peopleの中身を一つずつ見ていき
    .filter((p) => !/^[a-z0-9-]+$/.test(p.slug))//slugが英小文字・数字・ハイフン以外の文字を含んでいるものだけを抽出し
    .map((p) => ({ id: p.id, slug: p.slug }));//最終的にidとslugのオブジェクトの配列として返す

  const ok =//以下の場合、ok=trueとする
    duplicatePeopleSlugs.length === 0 &&//① people の slug 重複チェックに問題がないこと
    missingPersonRefs.length === 0 &&//② evaluations -> person 参照が壊れていないこと
    invalidPeopleSlugs.length === 0;//③ people の slug フォーマットに問題がないこと

  return {//最終的なチェック結果を返す
    ok,
    summary: {
      peopleCount: people.length,//peopleエンドポイントから取得した人物データの総数
      evaluationsCount: evaluations.length,//evaluationsエンドポイントから取得した評価データの総数
      duplicatePeopleSlugs: duplicatePeopleSlugs.length,//重複しているslugの数
      missingPersonRefs: missingPersonRefs.length,//参照が壊れている評価データの数
      invalidPeopleSlugs: invalidPeopleSlugs.length,//フォーマットが不正なslugの数
    },
    details: {//各チェック項目の詳細なデータを返す
      duplicatePeopleSlugs,//重複しているslugのリスト
      missingPersonRefs,//参照が壊れている評価データのリスト
      invalidPeopleSlugs,//フォーマットが不正なslugのリスト
      // 参考：slug一覧（必要なら）
      peopleSlugs: people.map((p) => p.slug).sort(),//peopleのslug一覧を配列に変換してソートしたもの
    },
  };
}
