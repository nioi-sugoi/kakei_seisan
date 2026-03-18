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
});
