import {
	fireEvent,
	render,
	screen,
	userEvent,
} from "@testing-library/react-native";
import { OtpForm } from "./otp-form";

function renderOtpForm(overrides: Partial<Parameters<typeof OtpForm>[0]> = {}) {
	const props = {
		email: "test@example.com",
		otp: "      ",
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

function getOtpInputs() {
	return Array.from({ length: 6 }, (_, i) =>
		screen.getByTestId(`otp-input-${i}`),
	);
}

describe("OtpForm", () => {
	const user = userEvent.setup();

	// --- 入力ロジック ---

	it("1文字入力で onChangeOtp が正しい値で呼ばれる", async () => {
		const { props } = renderOtpForm();
		await user.type(getOtpInputs()[0], "5");
		expect(props.onChangeOtp).toHaveBeenCalledWith("5     ");
	});

	it("3桁目に入力した場合、正しい位置に値がセットされる", async () => {
		const { props } = renderOtpForm();
		await user.type(getOtpInputs()[2], "7");
		expect(props.onChangeOtp).toHaveBeenCalledWith("  7   ");
	});

	it("非数字は除去される", async () => {
		const { props } = renderOtpForm();
		await user.type(getOtpInputs()[0], "a");
		expect(props.onChangeOtp).toHaveBeenCalledWith("      ");
	});

	// --- ペースト ---

	it("複数文字のペーストで各桁に分配される", async () => {
		const { props } = renderOtpForm();
		await user.paste(getOtpInputs()[0], "123456");
		expect(props.onChangeOtp).toHaveBeenCalledWith("123456");
	});

	it("途中の桁からペーストすると残り桁だけ埋まる", async () => {
		const { props } = renderOtpForm();
		await user.paste(getOtpInputs()[3], "789");
		expect(props.onChangeOtp).toHaveBeenCalledWith("   789");
	});

	// --- Backspace ---

	it("空の桁で Backspace を押すと前桁が消去される", () => {
		const { props } = renderOtpForm({ otp: "1     " });
		fireEvent(getOtpInputs()[1], "keyPress", {
			nativeEvent: { key: "Backspace" },
		});
		expect(props.onChangeOtp).toHaveBeenCalledWith("      ");
	});

	// --- 状態制御 ---

	it("loading=true のとき全 TextInput が編集不可になる", () => {
		renderOtpForm({ loading: true });
		for (const input of getOtpInputs()) {
			expect(input).toHaveProp("editable", false);
		}
	});

	it("loading=true のとき認証ボタンが切り替わる", () => {
		renderOtpForm({ loading: true });
		expect(screen.queryByText("認証する")).toBeNull();
	});

	it("エラーメッセージが表示される", () => {
		renderOtpForm({ error: "認証コードが正しくありません" });
		expect(screen.getByText("認証コードが正しくありません")).toBeOnTheScreen();
	});
});
