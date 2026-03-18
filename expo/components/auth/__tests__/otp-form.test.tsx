import { fireEvent, render, screen } from "@testing-library/react-native";
import { OtpForm } from "../otp-form";

function renderOtpForm(overrides: Partial<Parameters<typeof OtpForm>[0]> = {}) {
	const props = {
		email: "test@example.com",
		otp: "      ", // 6文字のスペース（空スロット）
		onChangeOtp: jest.fn(),
		error: "",
		loading: false,
		onSubmit: jest.fn(),
		onResend: jest.fn(),
		onReset: jest.fn(),
		...overrides,
	};
	render(<OtpForm {...props} />);
	return { props };
}

describe("OtpForm", () => {
	it("6つの TextInput がレンダリングされる", () => {
		renderOtpForm();
		const inputs = screen.getAllByDisplayValue("");
		expect(inputs).toHaveLength(6);
	});

	it("1文字入力で onChangeOtp が正しい値で呼ばれる", () => {
		const { props } = renderOtpForm();
		const inputs = screen.getAllByDisplayValue("");

		fireEvent.changeText(inputs[0], "5");

		// digitsToOtp: ["5"," "," "," "," "," "] → "5     "
		expect(props.onChangeOtp).toHaveBeenCalledWith("5     ");
	});

	it("3桁目に入力した場合、正しい位置に値がセットされる", () => {
		const { props } = renderOtpForm();
		const inputs = screen.getAllByDisplayValue("");

		fireEvent.changeText(inputs[2], "7");

		// slot0-1=スペース, slot2="7", slot3-5=スペース
		expect(props.onChangeOtp).toHaveBeenCalledWith("  7   ");
	});

	it("loading=true のとき全 TextInput が編集不可になる", () => {
		renderOtpForm({ loading: true });
		const inputs = screen.getAllByDisplayValue("");

		for (const input of inputs) {
			expect(input).toHaveProp("editable", false);
		}
	});

	it("loading=true のとき認証ボタンに ActivityIndicator が表示される", () => {
		renderOtpForm({ loading: true });
		expect(screen.queryByText("認証する")).toBeNull();
	});

	it("loading=false のとき認証ボタンに「認証する」テキストが表示される", () => {
		renderOtpForm({ loading: false });
		expect(screen.getByText("認証する")).toBeOnTheScreen();
	});

	it("エラーメッセージが表示される", () => {
		renderOtpForm({ error: "認証コードが正しくありません" });
		expect(screen.getByText("認証コードが正しくありません")).toBeOnTheScreen();
	});

	it("エラーが空文字のときエラーメッセージが表示されない", () => {
		renderOtpForm({ error: "" });
		expect(screen.queryByText("認証コードが正しくありません")).toBeNull();
	});

	it("メールアドレスが案内文に表示される", () => {
		renderOtpForm({ email: "user@test.com" });
		expect(
			screen.getByText("user@test.com に認証コードを送信しました。"),
		).toBeOnTheScreen();
	});
});
