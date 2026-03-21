// API ソースのクロスパッケージ型解決に必要な Cloudflare Workers 型定義。
// Expo アプリが @api/* パスエイリアスで API コードを参照する際、
// R2Bucket 等の Cloudflare 固有型を解決するために使用する。
/// <reference types="@cloudflare/workers-types" />
