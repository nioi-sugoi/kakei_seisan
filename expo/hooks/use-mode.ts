import { usePartnership } from "./use-partner-status";

export type UserMode = "solo" | "shared" | "managed";

export type ModeState = {
	myMode: UserMode;
	partnerMode: UserMode | null;
	hasPartner: boolean;
	isLoading: boolean;
};

export function useMode(): ModeState {
	const query = usePartnership();
	const partnership = query.data;

	if (!partnership) {
		return {
			myMode: "solo",
			partnerMode: null,
			hasPartner: false,
			isLoading: query.isLoading,
		};
	}

	return {
		myMode: partnership.myIsManaged ? "managed" : "shared",
		partnerMode: partnership.partnerIsManaged ? "managed" : "shared",
		hasPartner: true,
		isLoading: query.isLoading,
	};
}
