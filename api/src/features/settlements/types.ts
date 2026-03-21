export type Status = "approved" | "pending" | "rejected";

export type CreateSettlementInput = {
	amount: number;
	occurredOn: string;
};

export type ModifySettlementInput = {
	amount: number;
};
