import { usePartnership } from "./use-partner-status";

export type UserMode = "solo" | "shared" | "managed";

export type ModeState = {
	myMode: UserMode | null;
	partnerMode: UserMode | null;
	hasPartner: boolean;
	isLoading: boolean;
};

export function useMode(): ModeState {
	const query = usePartnership();
	const partnership = query.data;

	// undefined はロード中・エラー。null (ソロ確定) と区別しないと、管理モードユーザーの承認UIが silently に隠れる
	if (partnership === undefined) {
		return {
			myMode: null,
			partnerMode: null,
			hasPartner: false,
			isLoading: query.isLoading,
		};
	}

	if (partnership === null) {
		return {
			myMode: "solo",
			partnerMode: null,
			hasPartner: false,
			isLoading: false,
		};
	}

	return {
		myMode: partnership.myIsManaged ? "managed" : "shared",
		partnerMode: partnership.partnerIsManaged ? "managed" : "shared",
		hasPartner: true,
		isLoading: false,
	};
}
