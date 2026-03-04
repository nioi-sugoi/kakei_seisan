import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "./bindings";
import * as schema from "./db/schema";
import { createResendClient } from "./email";

export function createAuth(env: Env) {
	const db = drizzle(env.DB, { schema });

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification,
			},
		}),
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins: ["kakei-seisan://", "exp://", "http://localhost:*"],
		plugins: [
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					const resend = createResendClient(env.RESEND_API_KEY);
					await resend.emails.send({
						from: env.EMAIL_FROM,
						to: email,
						subject: "認証リンク - かんたん家計精算",
						html: `<p>以下のリンクをクリックして続けてください:</p><a href="${url}">認証する</a>`,
					});
				},
			}),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"]["session"];
export type SessionUser = Auth["$Infer"]["Session"]["user"];
