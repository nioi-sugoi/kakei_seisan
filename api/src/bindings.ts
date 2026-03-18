import type { Session, SessionUser } from "./auth";

export type Env = {
	DB: D1Database;
	RECEIPTS: R2Bucket;
	RESEND_API_KEY: string;
	EMAIL_FROM: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
};

export type AppVariables = {
	user: SessionUser | null;
	session: Session | null;
};
