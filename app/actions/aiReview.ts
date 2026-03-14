//AIレビュー機能の『司令塔（メイン処理）』：runAireviewAction(フロントエンド（画面）とバックエンド（心臓部）を安全につなぐ専用の窓口（橋渡し役）)を通してフロントエンドへ繋がる。
"use server";//ここに書かれた関数はブラウザでは動かない

import { prisma } from "@/infrastructure/prisma/client";////設計図(schema.prisma)を書き換えるたびにPrismaClient(電話回線)が新しく作らずに今あるものを使うための設定の関数
import { getOrCreateViewer } from "@/lib/viewer";//viewer（訪問者）を特定するための関数。
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";//Prismaは、Prismaが提供する型や関数の集合体で、データベース操作を行う際に使用される。

import type { ReviewTarget } from "@/lib/aiReview/types";//AIレビューの対象（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）を指定するためのオブジェクト
import type { ReviewSnapshot } from "@/lib/aiReview/snapshot";//AIレビューのスナップショット（トップレビュー、特定の人物の評価レビュー、いいね一覧レビュー、お気に入り一覧レビュー）をまとめた関数
import { buildReviewPrompt } from "@/lib/aiReview/prompt";//AIに渡す注文書を作る関数。
import { PROMPT_VERSION_INT, SCHEMA_VERSION_INT } from "@/lib/aiReview/versions";//プログラム専用の『型式番号』（バージョンはこのファイルだけで管理する）
import { ReviewV1Schema } from "@/lib/aiReview/reviewSchema";////ユーザーのアクション（AIレビュー生成ボタンをクリック）によってサイトがサーバーにリクエストし、サーバーがAIに頼んだものがJSONとして返ってきたもの（不安定なデータ）を検品及び型定義して、アプリで使える安全な形に変換するためのファイル
import { callLLMReview } from "@/lib/aiReview/callLLM";//AIに注文書(prompt)を送りレビュー結果を受け取るための「窓口（関数）」

import {
  buildPersonReviewSnapshot,//特定の人物の評価のAIレビューのスナップショットを生成する関数。引数には、person（特定の人物の情報）と、その人物に対する評価のリストが含まれます。返り値は、特定の人物の評価のAIレビューのスナップショットを表すPersonReviewSnapshot型のオブジェクトです。
  buildTopReviewSnapshot,//トップページ全体のAIレビューのスナップショットを生成する関数。引数には、people（全人物のリスト）、grouped（カテゴリーごとにグループ化された人物のリスト）、latestEvaluations（最新の評価のリスト）などが含まれます。返り値は、トップページ全体のAIレビューのスナップショットを表すTopReviewSnapshot型のオブジェクトです。
  buildLikesReviewSnapshot,//いいね一覧のAIレビューのスナップショットを生成する関数。引数には、evaluations（いいねされた評価のリスト）が含まれます。返り値は、いいね一覧のAIレビューのスナップショットを表すLikesReviewSnapshot型のオブジェクトです。
  buildFavoritesReviewSnapshot,//お気に入り一覧のAIレビューのスナップショットを生成する関数。引数には、people（お気に入りに登録された人物のリスト）が含まれます。返り値は、お気に入り一覧のAIレビューのスナップショットを表すFavoritesReviewSnapshot型のオブジェクトです。
} from "@/lib/aiReview/snapshot";

import { getPerson, getPeople, groupPeopleByCategory } from "@/lib/getPerson";
import { getEvaluationsByPerson } from "@/lib/getEvaluationsByPerson";
import { getLatestEvaluations } from "@/lib/getLatestEvaluations";
import { getEvaluationsByIds } from "@/lib/getEvaluationsByIds";//評価IDのリストから評価のリストを取得する関数

import type { RunAiReviewResult } from "@/lib/aiReview/actionResult";//サーバー側の処理（Action）から返ってくる結果の型定義をインポートする。
import type { Person } from "@/domain/entities";//ドメイン側の人物の型定義

export async function runAiReview(//フロントエンドからAIレビューの対象(トップ、個人、いいね一覧、お気に入り一覧)とpathToRevalidate(再描画するパス)を受け取り、AIレビュー機能の『司令塔（メイン処理）』を呼び出す。そして、その結果をRunAiReviewResultとしてフロントエンドに返す関数。
  //引数は以下の二つ
  target: ReviewTarget,
  pathToRevalidate: string
): Promise<RunAiReviewResult> {//返り値の型はRunAiReviewResult。AIレビューの結果が成功か失敗か、そして失敗ならエラーコードやメッセージを含む。
  const viewer = await getOrCreateViewer();//viewer（訪問者）を特定するための関数を呼び出して、viewerを取得する。viewerは、AIレビューを誰がリクエストしているかを識別するために必要な情報を含むオブジェクト。もしviewerが取得できない場合は、AIレビューの実行ができないため、エラーコードとメッセージを含むRunAiReviewResultを返す。
  if (!viewer) {
    // viewerが取れない = 実行不能（Cookie無効など）
    return { ok: false, code: "ERROR", message: "viewer not found (Cookieを有効にしてください)" };
  }

  const model = "gpt-4.1-mini";//使用するAIモデルの名前を指定する。ここでは、gpt-4.1-miniというモデルを使用している。モデルの選択は、レビューの品質やコストに影響するため、適切なモデルを選ぶことが重要。
  let snapshot: ReviewSnapshot | null = null;//AIレビューのスナップショットを格納する変数（ReviewSnapshot型を使用）。初期値はnull。

  //失敗しても落ちない設定にする（エラー内容を保存して後で見れるようにする）
  try {
    // 0) Rate limit（waitSec付き）（サーバー内部の処理）
    const oneMinuteAgo = new Date(Date.now() - 60_000);//現在の時刻から1分前の時刻を計算して、oneMinuteAgoという変数に格納する。これを使って、過去1分間に同じviewerがAIレビューをリクエストした回数を数えるための基準点とする。60_000：60秒（ミリ秒表記）
  
  //過去のレビュー実行履歴をDBからとる
    const recent = await prisma.aiReview.findMany({//prismaを使って、過去1分間に同じviewerがAIレビューをリクエストした回数を数える
      where: { viewerId: viewer.id, createdAt: { gte: oneMinuteAgo } },//viewerIdが現在のviewerのidと一致し、createdAtが過去１分間のレコードを取得する条件を指定している。これにより、過去1分間に同じviewerがAIレビューをリクエストした回数を数えることができる。
      orderBy: { createdAt: "asc" },//取得したレコードをcreatedAtの昇順（古い順）で並べ替える。これにより、過去1分間に同じviewerがAIレビューをリクエストした回数を数える際に、最も古いリクエストから順番に処理することができる。
      select: { createdAt: true },//取得するフィールドをcreatedAtのみに限定する。これにより、必要な情報だけを効率的に取得することができ、DBへの負担が軽くなる。
    });

    //3回以上なら待ち秒数を計算して、throwする（この後のDB保存などの高価な実行コードをする前に処理しておいてDBの負担を軽減する）
    if (recent.length >= 3) {//過去1分間に同じviewerがAIレビューをリクエストした回数が3回以上の場合、レート制限を適用するための処理を行う。
      const oldest = recent[0]!.createdAt.getTime();//recentは過去1分間に同じviewerがAIレビューをリクエストした回数を数えるためのDBからのレコードのリストで、createdAtフィールドのみを含む。recent[0]は最も古いリクエストのレコードで、そのcreatedAtフィールドの値をgetTime()メソッドでミリ秒表記のタイムスタンプに変換してoldestという変数に格納する。
      const retryAt = oldest + 60_000;//レート制限の基準点であるoldestに60秒（60_000ミリ秒）を加算して、retryAtという変数に格納する。これにより、次にAIレビューをリクエストできる時刻を計算することができる。
      const waitSec = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));//現在の時刻をDate.now()で取得し、retryAtから引いて、1000で割って秒数に変換する。さらに、Math.ceil()で切り上げて整数にし、Math.max(1, ...)で最低でも1秒の待ち時間を確保する。これにより、次にAIレビューをリクエストできるまでの待ち時間を秒単位で計算することができる。
      throw new Error(`RATE_LIMIT:${waitSec}`);//レート制限を適用するためのエラーをthrowする。待ち時間をカウントダウンすることができる。
    }

    // 1) snapshot生成
    //AIレビューの対象が特定の人物の場合のスナップショット関数にいれるまでの処理。
    if (target.type === "person") {//target.typeが"person"の場合、AIレビューの対象は特定の人物であると判断される。
      const slug = target.key;//target.key=personslug。slugを使うことで、AIレビューの対象となる特定の人物を正確に識別することができる。
      if (!slug) throw new Error("person target requires key(personSlug)");//target.keyが存在しない場合は、AIレビューの対象が特定の人物であると判断できないため、エラーをthrowする。

      const person = await getPerson(slug);//slugを引数に取って、そのslugに対応するPerson型のオブジェクトを返す関数を呼び出して、personという変数に格納する。これにより、AIレビューの対象となる特定の人物の情報を取得することができる。
      if (!person) throw new Error("person not found");//slugに対応する人物が見つからない場合は、AIレビューの対象が特定の人物であると判断できないため、エラーをthrowする。

      const evaluations = await getEvaluationsByPerson(slug);//slugを引数に取って、そのslugに対応する評価のリストを返す関数を呼び出して、evaluationsという変数に格納する。これにより、AIレビューの対象となる特定の人物に対する評価の情報を取得することができる。
      snapshot = buildPersonReviewSnapshot({ person, evaluations, takeLatest: 5 });//特定の人物の評価のAIレビューのスナップショットを生成する関数を呼び出して、snapshotという変数に格納する。引数には、person（特定の人物の情報）と、evaluations(その人物に対する評価のリスト)が含まれる。これにより、AIレビューの対象となる特定の人物とその評価に関する情報をまとめたスナップショットを作成することができる。
    
    //AIレビューの対象がトップページ全体の場合のスナップショット関数にいれるまでの処理。
    } else if (target.type === "top") {//target.typeが"top"の場合、AIレビューの対象はトップページ全体であると判断される。
      const people = await getPeople();//microCMSから人物一覧（PersonCMS）を取得してPerson型に変換し返す関数を呼び出して、peopleという変数に格納する。これにより、AIレビューの対象となるトップページ全体に表示される人物の情報を取得することができる。
      const grouped = groupPeopleByCategory(people);//人物のリストをカテゴリーごとにグループ化する関数を呼び出して、groupedという変数に格納する。引数には、people（全人物のリスト）が含まれる。これにより、AIレビューの対象となるトップページ全体に表示される人物をカテゴリーごとに整理することができる。
      const latest = await getLatestEvaluations(5);//最新の評価のリストを取得する関数を呼び出して、latestという変数に格納する。引数には、5（最新の評価を5件取得することを指定）が含まれる。これにより、AIレビューの対象となるトップページ全体に関連する最新の評価の情報を取得することができる。

      snapshot = buildTopReviewSnapshot({//トップページ全体のAIレビューのスナップショットを生成する関数を呼び出して、snapshotという変数に格納する。引数には、以下の通り。
        people,
        grouped,
        latestEvaluations: latest,
        takeLatest: 5,
        takeTopPersonsPerCategory: 3,
      });

      //AIレビューの対象がいいね一覧の場合のスナップショット関数にいれるまでの処理。
    } else if (target.type === "likes") {//target.typeが"likes"の場合、AIレビューの対象はいいね一覧であると判断される。
      const likes = await prisma.like.findMany({//prismaを使って、いいね一覧のデータをDBから取得する。
        where: { viewerId: viewer.id },//viewerIdをもとにいいね一覧を探す。これにより、AIレビューの対象となるいいね一覧に関連するデータを取得することができる。
        select: { evaluationId: true },//取得するフィールドをevaluationIdのみに限定する。これにより、必要な情報だけを効率的に取得することができ、DBへの負担が軽くなる。
        take: 50,//最新のいいねを50件取得する。
      });

      const ids = likes.map((l) => l.evaluationId);//取得したいいね一覧のデータから、評価IDのリストを作る。これにより、AIレビューの対象となるいいね一覧に関連する評価の情報を取得するための準備ができる。
      const evals = await getEvaluationsByIds(ids);//評価IDのリストから評価のリストを取得する関数を呼び出して、evalsという変数に格納する。これにより、AIレビューの対象となるいいね一覧に関連する評価の情報を取得することができる。

      snapshot = buildLikesReviewSnapshot({ evaluations: evals, takeLatest: 10 });//いいね一覧のAIレビューのスナップショットを生成する関数を呼び出して、snapshotという変数に格納する。引数には、評価のリスト(evals)と最新の評価を10件取得することを指定するtakeLatestが含まれる。これにより、AIレビューの対象となるいいね一覧に関連する評価の情報をまとめたスナップショットを作成することができる。

      //AIレビューの対象がお気に入り一覧の場合のスナップショット関数にいれるまでの処理。
    } else if (target.type === "favorites") {//target.typeが"favorites"の場合、AIレビューの対象はお気に入り一覧であると判断される。
      const favs = await prisma.favorite.findMany({//prismaを使って、お気に入り一覧のデータをDBから取得する。
        where: { viewerId: viewer.id },//viewerIdをもとにお気に入り一覧を探す。これにより、AIレビューの対象となるお気に入り一覧に関連するデータを取得することができる。
        select: { personSlug: true },//取得するフィールドをpersonSlugのみに限定する。これにより、必要な情報だけを効率的に取得することができ、DBへの負担が軽くなる。
        take: 50,//最新のお気に入りを50件取得する。
      });

      const slugs = favs.map((f) => f.personSlug);//お気に入りに登録された人物のslugのリストを作る。

      const isPerson = (p: Person | null): p is Person => p !== null;//Person型かどうかを判定するための関数。引数pがnullでなければPerson型であると判断する。これを使うことで、getPerson関数から返ってくるPerson型のオブジェクトだけを扱うことができるようになる。次の行で使うfilter(isPerson)のための関数。
      const people = (await Promise.all(slugs.map((s) => getPerson(s)))).filter(isPerson);//slugのリストから、それぞれのslugに対応するPerson型のオブジェクトを取得して、peopleのリストを作る。getPerson関数はslugを引数に取って、そのslugに対応するPerson型のオブジェクトを返す関数。Promise.allを使うことで、複数のgetPerson関数の呼び出しを同時に行い、全ての結果が揃うまで待つことができる。filter(isPerson)を使うことで、nullでないPerson型のオブジェクトだけをpeopleのリストに残すことができる。

      snapshot = buildFavoritesReviewSnapshot({ people, takeLatest: 20 });//お気に入り一覧のAIレビューのスナップショットを生成する関数を呼び出して、snapshotという変数に格納する。引数には、お気に入りに登録された人物のリスト(people)と最新のお気に入りを20件取得することを指定するtakeLatestが含まれる。これにより、AIレビューの対象となるお気に入り一覧に関連する人物の情報をまとめたスナップショットを作成することができる。
    
      //target.typeが"person"でも"top"でも"likes"でも"favorites"でもない場合は、AIレビューの対象が不明であるため、エラーをthrowする。
    } else {
      throw new Error("snapshot builder not implemented for target");
    }

    // 2) prompt生成
    const { system, user } = buildReviewPrompt({ target, snapshot });//AIに渡す注文書を作る関数を呼び出して、systemとuserという変数に格納する。引数には、target（AIレビューの対象）とsnapshot（AIレビューのスナップショット）が含まれる。これにより、AIに渡す注文書を生成するための情報が準備される。

    // 3) LLM呼び出し → JSON検証 → 保存（success）
    const llm = await callLLMReview({ system, user, model });//AIに注文書(prompt)を送りレビュー結果を受け取るための「窓口（関数）」を呼び出して、llmという変数に格納する。引数には、system（AIの「キャラクター設定」と「絶対ルール」）、user（具体的な依頼内容（データ）、model（使用するAIモデルの名前）が含まれる。これにより、AIに注文書を送ってレビュー結果を受け取ることができる。
    const parsed = ReviewV1Schema.parse(llm.result);//サーバーがAIに頼んだ結果、JSONとして返ってきたもの（不安定なデータ）を検品及び型定義して、アプリで使える安全な形に変換するための関数を呼び出して、parsedという変数に格納する。引数には、llm.result（AIからのレビュー結果）が含まれる。これにより、AIからのレビュー結果を安全な形で扱うことができるようになる。形が正しければ parsed を返す。形が違えば例外を投げる（catch (err: unknown)：エラーでも保存に行く）

    await prisma.aiReview.create({//prismaを使って、AIレビューの結果をDBに保存する。これにより、AIレビューの結果を後で参照したり分析したりすることができるようになる。
      data: {
        viewerId: viewer.id,
        targetType: target.type,
        targetKey: target.key ?? null,
        //Zodで検品していても、PrismaとTypeScriptの相性の問題で以下の処理が必要。Zodが保証する「正しさ」と、Prismaが求める「型の定義」が100%一致しないから。Prismaの期待 (InputJsonValue)は非常に複雑で巨大な型を期待している。
        inputSnapshot: snapshot as unknown as Prisma.InputJsonValue,//as unknown as ... は「型を一度unknownにしてから変換する」テク。as unknown (一旦、正体を消す）→ Prisma.InputJsonValue（Prismaが扱えるJSONの型）に変換する。これにより、TypeScriptの型チェックを無理やり黙らせて、Prismaが要求する型に変換する（検品済みだから大丈夫と言う意思表示）。
        resultJson: parsed as unknown as Prisma.InputJsonValue,//as unknown as ... は「型を一度unknownにしてから変換する」テク。as unknown (一旦、正体を消す）→ Prisma.InputJsonValue（Prismaが扱えるJSONの型）に変換する。これにより、TypeScriptの型チェックを無理やり黙らせて、Prismaが要求する型に変換する（検品済みだから大丈夫と言う意思表示）。
        model,
        status: "success",
        errorMessage: null,
        promptVersion: PROMPT_VERSION_INT,
        schemaVersion: SCHEMA_VERSION_INT,
        tokensInput: llm.tokensInput ?? null,
        tokensOutput: llm.tokensOutput ?? null,
        costUsdMicro: llm.costUsdMicro ?? null,
      },
    });

    revalidatePath(pathToRevalidate);//Next.jsのキャッシュを更新して、ページを再描画させる。これにより、Next.jsのキャッシュを更新して、ページを再描画させる
    
    return { ok: true };//AIレビューの実行が成功したことを示すRunAiReviewResultを返す。フロントエンドはこの結果を受け取って、ユーザーに成功のメッセージを表示したり、AIレビューの結果を画面に反映させたりすることができる。
  } catch (err: unknown) {//AIレビューの実行中にエラーが発生した場合(ReviewV1Schema:検品で形が違うためエラーが出た場合など）の処理。エラー内容を保存して後で見れるようにするためのコード。
    const message = err instanceof Error ? err.message : String(err);//エラーオブジェクトからエラーメッセージを取得する。errがErrorのインスタンスであれば、そのmessageプロパティを使用する。そうでなければ、errを文字列に変換してエラーメッセージとする。これにより、エラーの内容をわかりやすく保存することができる。

    // errorでも保存（snapshotが作れていれば一緒に残す）
    await prisma.aiReview.create({//
      data: {
        viewerId: viewer.id,
        targetType: target.type,
        targetKey: target.key ?? null,
        inputSnapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        resultJson: Prisma.DbNull,
        model,
        status: "error",
        errorMessage: message,
        promptVersion: PROMPT_VERSION_INT,
        schemaVersion: SCHEMA_VERSION_INT,
      },
    });

    revalidatePath(pathToRevalidate);//Next.jsのキャッシュを更新して、ページを再描画させる。これにより、Next.jsのキャッシュを更新して、ページを再描画させる

    // エラーを翻訳して画面に返す（受付窓口）RunAiReviewResultの準備段階
    if (message.startsWith("RATE_LIMIT:")) {//エラーメッセージが"RATE_LIMIT:"で始まる場合、レート制限に関連するエラーであると判断する。これにより、レート制限のエラーを特定して、適切な対応をすることができる。
      const waitSec = Number(message.split(":")[1]);//Rate limitのサーバー内部処理でthrowされたエラーメッセージを":"で分割して、2番目の部分を取り出して、数値に変換してwaitSecという変数に格納する。これにより、レート制限のエラーから待ち時間を抽出することができる。
      return {//レート制限のエラーであることを示すRunAiReviewResultを返す。フロントエンドはこの結果を受け取って、ユーザーにレート制限中であることを伝えるメッセージを表示したり、待ち時間のカウントダウンを表示したりすることができる。
        ok: false,
        code: "RATE_LIMIT",
        waitSec: Number.isFinite(waitSec) ? waitSec : 60,
        message: "レート制限中です。少し待ってください。",
      };
    }

    return { ok: false, code: "ERROR", message };//AIレビューの実行が失敗したことを示すRunAiReviewResultを返す。フロントエンドはこの結果を受け取って、ユーザーにエラーの内容を伝えるメッセージを表示したり、再試行のオプションを提供したりすることができる。
  }
}