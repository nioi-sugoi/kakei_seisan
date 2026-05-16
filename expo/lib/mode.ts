export type UserMode = "solo" | "shared" | "managed";

export function deriveUserMode(
	hasPartner: boolean,
	isManaged: boolean,
): UserMode {
	if (!hasPartner) return "solo";
	return isManaged ? "managed" : "shared";
}
