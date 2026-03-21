import { env } from "cloudflare:test";
import { testClient } from "hono/testing";
import type { AppType } from "../index";
import app from "../index";

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
export const client = testClient(app as unknown as AppType, env);
