/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		RECEIPTS: R2Bucket;
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL: string;
		RESEND_API_KEY: string;
		EMAIL_FROM: string;
		TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
	}
}
