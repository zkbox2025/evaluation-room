//lib/aiReview/versions.ts
//プログラム専用の『型式番号』（バージョンはこのファイルだけで管理する）
export const PROMPT_VERSION_INT = 1 as const;//AIへの指示（プロンプト）を書き換えた際に、システム側が「どのバージョンの指示を使っているか」を識別できるようにしている
export const SCHEMA_VERSION_INT = 1 as const;//設計図（スキーマ）のデータの形式を変更した際、古いデータと新しいデータが混ざってエラーが起きないよう、判別するために使われる
export const PROMPT_VERSION = `review-prompt-v${PROMPT_VERSION_INT}` as const;//AIへの命令（プロンプト）を変えるときにバージョンを上げるための定数
export const JSON_SCHEMA_VERSION = "review-v1" as const; //AIが出力した中身（JSONテキスト）に刻印される名前（Zodのルール（review-v1）で読み取る）

