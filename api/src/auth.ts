import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import Database from "better-sqlite3";

/**
 * Better Auth 設定。
 *
 * CLI (npx auth generate) 用にインメモリ SQLite を使用。
 * ランタイム用の設定は Hono ミドルウェアで D1 バインディングから構成する。
 */
export const auth = betterAuth({
	database: new Database(":memory:"),
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "dummy",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "dummy",
		},
		apple: {
			clientId: process.env.APPLE_CLIENT_ID ?? "dummy",
			clientSecret: process.env.APPLE_CLIENT_SECRET ?? "dummy",
		},
	},
	plugins: [
		magicLink({
			sendMagicLink: async () => {},
		}),
	],
	user: {
		additionalFields: {
			isManaged: {
				type: "boolean",
				defaultValue: false,
			},
		},
	},
});
