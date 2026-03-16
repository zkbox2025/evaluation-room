//AIレビューの回数オーバーが発生したことを、プログラムが正しく理解するための専用の型
//専用のクラス」にすることで、「何秒待てばいいか」という数値データを壊さずに、確実に受け渡しできるようにする

export class RateLimitError extends Error {//標準のErrorクラスを継承することで、throwキーワードで投げることができ、スタックトレース（エラー発生場所の記録）も保持される
  constructor(public waitSec: number) {//引数にpublicを付けることで、「エラーが起きたらあと何秒待てばいいか」という数値を、インスタンスのプロパティとして保持できるようにしている
    // 親クラスのErrorには、ログ出力用の固定メッセージを渡す
    super("RATE_LIMIT_EXCEEDED");//渡している文字列はエラーメッセージになる。この場合、ログなどには一律で "RATE_LIMIT_EXCEEDED" と表示される。
    this.name = "RateLimitError";

    // プロトタイプの設定（TypeScriptでinstanceofを正しく動作させるため）
    Object.setPrototypeOf(this, RateLimitError.prototype);//古いJavaScript（ES5）へコンパイルする場合、継承したクラスで instanceof（型チェック）が正しく動作しなくなるバグがある。この一行を入れることで、if (e instanceof RateLimitError) という判定が確実に動くようになる。
  }
}