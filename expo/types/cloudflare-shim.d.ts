// hono/client で AppType を解決する際に必要な Cloudflare Workers 型のスタブ。
// 実際の型定義は api パッケージの @cloudflare/workers-types が提供する。
// RPC クライアントの型推論にはバインディングの内部構造は不要なため、
// 空インターフェースで十分。
declare type D1Database = {};
declare type R2Bucket = {};
