import type { Session, SessionUser } from "./auth";

export type AppVariables = {
	user: SessionUser | null;
	session: Session | null;
};
