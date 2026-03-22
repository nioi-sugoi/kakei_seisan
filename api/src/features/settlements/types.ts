export type SettlementCategory = "refund" | "repayment";

export type CreateSettlementInput = {
	category: SettlementCategory;
	amount: number;
	occurredOn: string;
};

export type ModifySettlementInput = {
	amount: number;
};
