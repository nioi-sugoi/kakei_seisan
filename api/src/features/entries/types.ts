export type Category = "advance" | "deposit";
export type Status = "approved" | "pending" | "rejected";

export type CreateEntryInput = {
	category: Category;
	amount: number;
	occurredOn: string;
	label: string;
	memo?: string;
};

export type ModifyEntryInput = {
	amount: number;
	label: string;
	memo?: string;
};
