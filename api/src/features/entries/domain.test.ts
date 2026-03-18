import { describe, expect, it } from "vitest";
import { validateCreateEntry } from "./domain";
import type { CreateEntryInput } from "./types";

const validInput: CreateEntryInput = {
	category: "advance",
	amount: 1000,
	date: "2026-03-19",
	label: "スーパー買い物",
};

describe("validateCreateEntry", () => {
	it("有効な入力でエラーなし", () => {
		expect(validateCreateEntry(validInput)).toEqual([]);
	});

	it("メモ付きでもエラーなし", () => {
		expect(
			validateCreateEntry({ ...validInput, memo: "夕飯の材料" }),
		).toEqual([]);
	});

	it("金額0円は有効", () => {
		expect(
			validateCreateEntry({ ...validInput, amount: 0 }),
		).toEqual([]);
	});

	it("deposit カテゴリも有効", () => {
		expect(
			validateCreateEntry({ ...validInput, category: "deposit" }),
		).toEqual([]);
	});

	it("負の金額はエラー", () => {
		const errors = validateCreateEntry({ ...validInput, amount: -1 });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("amount");
	});

	it("小数の金額はエラー", () => {
		const errors = validateCreateEntry({ ...validInput, amount: 100.5 });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("amount");
	});

	it("空ラベルはエラー", () => {
		const errors = validateCreateEntry({ ...validInput, label: "" });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("label");
	});

	it("空白のみのラベルはエラー", () => {
		const errors = validateCreateEntry({ ...validInput, label: "   " });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("label");
	});

	it("不正な日付形式はエラー", () => {
		const errors = validateCreateEntry({ ...validInput, date: "2026/03/19" });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("date");
	});

	it("存在しない日付はエラー（2月31日）", () => {
		const errors = validateCreateEntry({ ...validInput, date: "2026-02-31" });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("date");
	});

	it("存在しない日付はエラー（13月）", () => {
		const errors = validateCreateEntry({ ...validInput, date: "2026-13-01" });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("date");
	});

	it("うるう年の2月29日は有効", () => {
		expect(
			validateCreateEntry({ ...validInput, date: "2028-02-29" }),
		).toEqual([]);
	});

	it("非うるう年の2月29日はエラー", () => {
		const errors = validateCreateEntry({ ...validInput, date: "2026-02-29" });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("date");
	});

	it("不正なカテゴリはエラー", () => {
		const errors = validateCreateEntry({
			...validInput,
			category: "invalid" as "advance",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("category");
	});

	it("複数エラーを同時に返す", () => {
		const errors = validateCreateEntry({
			category: "invalid" as "advance",
			amount: -1,
			date: "bad",
			label: "",
		});
		expect(errors.length).toBeGreaterThanOrEqual(4);
	});
});
