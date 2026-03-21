import { applyD1Migrations, env } from "cloudflare:test";
import { testClient } from "hono/testing";
import type { AppType } from "../index";
import app from "../index";
import { buildAuthCookie } from "./auth-helper";

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
export const client = testClient(app as unknown as AppType, env);

export let authCookie: string;

export async function setupAuth() {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	authCookie = await buildAuthCookie();
}
