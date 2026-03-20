import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	cloudflareTest,
	readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
	const migrations = await readD1Migrations(path.join(__dirname, "drizzle"));

	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.toml" },
				miniflare: {
					bindings: {
						TEST_MIGRATIONS: migrations,
						BETTER_AUTH_SECRET:
							"test-secret-for-integration-tests!",
						BETTER_AUTH_URL: "http://localhost:8787",
						RESEND_API_KEY: "re_test_dummy",
						EMAIL_FROM: "test@example.com",
					},
				},
			}),
		],
		resolve: {
			alias: {
				// svix は resend の Webhook 検証用。テストでは不要なためスタブ化
				svix: path.join(__dirname, "src/test-stubs/svix.ts"),
			},
		},
		test: {
			include: ["src/**/*.test.ts"],
		},
	};
});
