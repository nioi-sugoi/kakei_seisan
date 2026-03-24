export type SettlementCategory = "fromUser" | "fromHousehold";

export type CreateSettlementInput = {
	category: SettlementCategory;
	amount: number;
	occurredOn: string;
};

export type ModifySettlementInput = {
	amount: number;
};
