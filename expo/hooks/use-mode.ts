import { deriveUserMode, type UserMode } from "@/lib/mode";
import { usePartnership } from "./use-partner-status";

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
		myMode: deriveUserMode(true, partnership.myIsManaged),
		partnerMode: deriveUserMode(true, partnership.partnerIsManaged),
		hasPartner: true,
		isLoading: false,
	};
}
