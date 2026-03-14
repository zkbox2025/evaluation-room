//AIレビュー機能を呼び出すボタン。ボタンが押された時にサーバー側の処理（Action）を実行し、
//その間の「ローディング状態」や「連続クリック防止（レート制限）」を管理する。また、サーバー側の処理から返ってきた結果（成功メッセージやエラーメッセージ、レート制限の待ち秒数）をユーザーに表示する。
"use client";

import { useEffect, useState, useTransition } from "react";//useTransition:サーバー側の処理（非同期処理）が終わるまで待っているかどうか」を自動で判定。useState: メッセージ内容、ボタンのロック状態、そしてレート制限の残り時間（waitSec）を保持する。useEffect：画面の表示（レンダリング）とは直接関係ない処理を、特定のタイミングで動かしたいときに使う。ここでは、waitSecが更新されたときにカウントダウンを開始するために使う。
import { runAiReviewAction } from "@/app/actions/runAiReviewAction";//フロントエンド（画面）とバックエンド（心臓部）を安全につなぐ『専用の窓口（橋渡し役）』」としての役割を持つサーバー側の処理（Action）。フロントエンドからAIレビューの対象とpathToRevalidate(再描画するパス)を受け取り、AIレビュー機能の『司令塔（メイン処理）』を呼び出す。
import type { ReviewTarget } from "@/lib/aiReview/types";

type Props = {//このコンポーネントが受け取るpropsの型定義
  target: ReviewTarget;//AIレビューの対象（トップページ全体、特定の人物の評価、いいね一覧、お気に入り一覧）を指定するためのオブジェクト。typeはReviewTarget型。
  pathToRevalidate: string;//pathToRevalidateはAIレビュー実行後に再描画（再検証）するパスを指定する文字列。
  label?: string;//ボタンに表示するテキスト。省略可能でデフォルトは「AIレビューを実行」。
};

export function RunAiReviewButton({ target, pathToRevalidate, label = "AIレビューを実行" }: Props) {
  const [isPending, startTransition] = useTransition();//AIレビューの実行などをstartTransitionの中で包むことで、Reactに「これはバックグラウンドでやっていいよ」と伝え、isPendingでボタンで「今クリックの実行中だよ」ということをローディング表示にして教えたりクリックを無効化する。


  const [message, setMessage] = useState<string | null>(null);//ユーザーに見せるメッセージ(setMessage:書き換え用関数にmessage：文字列（書き換えの内容）を入れてReactに表示用に置き換えをお願いする)を管理するusestate。AIレビューの実行に成功したときや失敗したとき、そしてレート制限中の待ち時間を表示するために使う。初期値はnull（何も表示しない）。
  const [locked, setLocked] = useState(false);//locked(ロック(true)かロックじゃない(false)かの状態)をsetLockedに入れてReactに指示を出す。それを管理するuseState。連続クリックを防止するために、AIレビューの実行中はロックして、実行が終わったらロックを解除する。初期値はfalse（ロックしていない状態）。

  // ★ レート制限の残り秒数（nullなら制限なし）
  const [waitSec, setWaitSec] = useState<number | null>(null);//waitSec（待ち秒数）をsetWaitSecに入れてReactに表示用に置き換えをお願いする。それを管理するuseState。サーバー側の処理からレート制限の待ち秒数が返ってきたときに、その秒数をセットしてUIに表示する。初期値はnull（制限なし）。

  // ★ カウントダウン（waitSecがある間だけ毎秒減らす）
  useEffect(() => {//waitSecが更新されたときにカウントダウンを開始するためのuseEffect。waitSecがnullでなければ、1秒ごとにwaitSecを1ずつ減らしていく。waitSecが0以下になったらnullにして制限解除する。コンポーネントがアンマウントされた（ユーザーがページ移動する）ときやwaitSecがnullに変わったときには、setIntervalで作ったタイマーをクリアして無駄な処理を防ぐ。
    if (waitSec === null) return;//待ち時間がなければ何もしない

    const t = setInterval(() => {//1秒ごとにこの関数を実行するタイマーをセットする。tにはタイマーIDが入る。
      setWaitSec((s) => {//waitSecを1秒ずつ減らす。0秒以下になったらnullにして制限解除
        if (s === null) return null;//もしsがnullならnullのまま（制限なしのまま）
        if (s <= 1) return null;//もしsが1以下ならnullにして制限解除
        return s - 1;//それ以外はsを1減らす
      });
    }, 1000);//1000ミリ秒（1秒）ごとにsetWaitSecの中の関数を実行するタイマーをセットする。

    return () => clearInterval(t);//クリーンアップ関数：コンポーネントがアンマウント（ユーザーがページ移動するとき）やwaitSecがnullに変わったときに、setIntervalで作ったタイマーをクリア（動作終了）して無駄な処理を防ぐ。
  }, [waitSec]);

  const onClick = () => {//ボタンがクリックされたときの処理。レート制限中や処理中はボタンを押せない。クリックされたらロックしてメッセージを消して、サーバー側の処理（runAiReviewAction）を呼び出す。処理が成功したら成功のメッセージを表示し、失敗したらエラーメッセージを表示する。最後にロックを解除する。
    // ★ レート制限中は押せない
    if (waitSec !== null) return;//waitSecがnullでなければ（レート制限中なら）ボタンを押せない
    if (isPending || locked) return;//処理中（isPending）やロック中（locked）はボタンを押せない

    setLocked(true);//ロックする（連続クリックを防止するため）
    setMessage(null);//メッセージを消す（前の結果が残っていると紛らわしいため）

    startTransition(async () => {//サーバー側の処理（非同期処理）をstartTransitionの中で包むことで、Reactに「これはバックグラウンドでやっていいよ」と伝える。これにより、isPendingがtrueになり、UIは「処理中」という状態になる。処理が終わるとisPendingがfalseになり、UIは通常の状態に戻る。
      try {
        const res = await runAiReviewAction(target, pathToRevalidate);//runAiReviewAction（サーバー側の処理）を呼び出し、AIレビューの結果が返ってくるのを待って、結果が返ってきてから次の行（if (!res?.ok) {）に進む（返事をresの中に入れる。現時点ではただの変数なのでReactが表示用に置き換え（レンダリング）する）。

        if (!res?.ok) {//もしresが存在しないなら（サーバーから返事がないなら）あるいはres.okがfalseなら（サーバーから返事はあったけどAIレビューの実行に失敗したなら）
          // ✅ RATE_LIMIT の場合：待ち秒数を表示（AIのAPIなどは費用がかかるため）
          //サーバー側の処理から返ってきたエラーコードが「RATE_LIMIT」の場合
          if (res.code === "RATE_LIMIT") {
            setWaitSec(res.waitSec);//サーバーから返ってきた待ち秒数(res.waitSec)をsetwaitSecにセットして、UIに表示する。
            setMessage(null);//メッセージは消す（秒数が表示されているから説明は十分なはず）
            return;
          }

          // その他エラー
          //サーバーから返ってきたエラーメッセージ(res.message)があればそれを表示、なければ「レビュー実行に失敗しました」というデフォルトメッセージを表示する。
          setMessage(`失敗しました：${res.message ?? "レビュー実行に失敗しました"}`);
          return;
        }
      //成功した場合
        setMessage("レビューを実行しました（保存/再描画）");//成功した場合はレビューを実行しました（保存/再描画）というメッセージをsetMessageにセットしReactが書き換え後に表示。
      } catch (e) {//予期せぬエラーが起きた場合は、そのエラーメッセージを表示する。
        setMessage(`失敗しました：${e instanceof Error ? e.message : String(e)}`);//三項演算子（A ? B : C ＝もしAならBそうでなければC）エラーオブジェクトeがError型のインスタンスなら（JavaScriptが決めた「エラーの形」）そのメッセージ表示し、そうでなければeを文字列に変換したものを表示する（型エラーにならないように）。
      } finally {//成功でも失敗でも、処理が終わったらロックを解除する。
        setLocked(false);
      }
    });
  };

  const disabled = isPending || locked || waitSec !== null;//ボタンが押せない条件：処理中（isPending）、ロック中（locked）、レート制限中（waitSec !== null）

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending || locked
          ? "レビュー実行中..."
          : waitSec !== null
          ? `待機中（${waitSec}秒）`
          : label}
      </button>

      {/* rate limit */}
      {waitSec !== null ? (//レート制限中なら待ち秒数と説明を表示する。そうでなくて、もしmessageがあれば（成功メッセージやエラーメッセージがあれば）それを表示する。それ以外はnull（何も表示しない）。
        <p className="text-xs text-red-600">
          レート制限中です。{waitSec}秒待ってから再実行してください。
        </p>
      ) : message ? (
        <p className="text-xs text-gray-600 whitespace-pre-wrap">{message}</p>
      ) : null}
    </div>
  );
}