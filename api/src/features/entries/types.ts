export type Category = "advance" | "deposit";
export type Operation = "original" | "modification" | "cancellation";
export type Status = "approved" | "pending" | "rejected";

export type CreateEntryInput = {
	category: Category;
	amount: number;
	date: string;
	label: string;
	memo?: string;
};
