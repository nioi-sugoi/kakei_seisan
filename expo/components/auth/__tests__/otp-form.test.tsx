import {
	fireEvent,
	render,
	screen,
	userEvent,
} from "@testing-library/react-native";
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

function getOtpInputs() {
	return Array.from({ length: 6 }, (_, i) =>
		screen.getByTestId(`otp-input-${i}`),
	);
}

describe("OtpForm", () => {
	const user = userEvent.setup();

	// --- レンダリング ---

	it("6つの TextInput がレンダリングされる", () => {
		renderOtpForm();
		const inputs = getOtpInputs();
		expect(inputs).toHaveLength(6);
	});

	it("メールアドレスが案内文に表示される", () => {
		renderOtpForm({ email: "user@test.com" });
		expect(
			screen.getByText("user@test.com に認証コードを送信しました。"),
		).toBeOnTheScreen();
	});

	it("loading=false のとき「認証する」テキストが表示される", () => {
		renderOtpForm({ loading: false });
		expect(screen.getByText("認証する")).toBeOnTheScreen();
	});

	it("loading=true のとき「認証する」テキストが非表示になる", () => {
		renderOtpForm({ loading: true });
		expect(screen.queryByText("認証する")).toBeNull();
	});

	// --- エラー表示 ---

	it("エラーメッセージが表示される", () => {
		renderOtpForm({ error: "認証コードが正しくありません" });
		expect(screen.getByText("認証コードが正しくありません")).toBeOnTheScreen();
	});

	it("エラーが空文字のときエラーメッセージが表示されない", () => {
		renderOtpForm({ error: "" });
		expect(screen.queryByText("認証コードが正しくありません")).toBeNull();
	});

	// --- onChangeText 経由の入力 ---

	it("1文字入力で onChangeOtp が正しい値で呼ばれる", async () => {
		const { props } = renderOtpForm();
		const inputs = getOtpInputs();

		await user.type(inputs[0], "5");

		expect(props.onChangeOtp).toHaveBeenCalledWith("5     ");
	});

	it("3桁目に入力した場合、正しい位置に値がセットされる", async () => {
		const { props } = renderOtpForm();
		const inputs = getOtpInputs();

		await user.type(inputs[2], "7");

		expect(props.onChangeOtp).toHaveBeenCalledWith("  7   ");
	});

	it("非数字（アルファベット）は除去される", async () => {
		const { props } = renderOtpForm();
		const inputs = getOtpInputs();

		await user.type(inputs[0], "a");

		// cleaned = "" → newDigits[0] = ""
		expect(props.onChangeOtp).toHaveBeenCalledWith("      ");
	});

	it("複数文字のペーストで各桁に分配される", async () => {
		const { props } = renderOtpForm();
		const inputs = getOtpInputs();

		await user.paste(inputs[0], "123456");

		expect(props.onChangeOtp).toHaveBeenCalledWith("123456");
	});

	it("途中の桁からペーストすると残り桁だけ埋まる", async () => {
		const { props } = renderOtpForm();
		const inputs = getOtpInputs();

		await user.paste(inputs[3], "789");

		expect(props.onChangeOtp).toHaveBeenCalledWith("   789");
	});

	// --- Backspace (onKeyPress) ---
	// userEvent には onKeyPress のシミュレーションがないため fireEvent を使用

	it("空の桁で Backspace を押すと前桁が消去される", () => {
		const { props } = renderOtpForm({ otp: "1     " });
		const inputs = getOtpInputs();

		fireEvent(inputs[1], "keyPress", {
			nativeEvent: { key: "Backspace" },
		});

		expect(props.onChangeOtp).toHaveBeenCalledWith("      ");
	});

	// --- loading 状態 ---

	it("loading=true のとき全 TextInput が編集不可になる", () => {
		renderOtpForm({ loading: true });
		const inputs = getOtpInputs();

		for (const input of inputs) {
			expect(input).toHaveProp("editable", false);
		}
	});

	// --- ボタン押下 ---

	it("認証するボタン押下で onSubmit が呼ばれる", async () => {
		const { props } = renderOtpForm();
		await user.press(screen.getByText("認証する"));
		expect(props.onSubmit).toHaveBeenCalledTimes(1);
	});

	it("コードを再送信ボタン押下で onResend が呼ばれる", async () => {
		const { props } = renderOtpForm();
		await user.press(screen.getByText("コードを再送信"));
		expect(props.onResend).toHaveBeenCalledTimes(1);
	});

	it("別のメールアドレスで試すボタン押下で onReset が呼ばれる", async () => {
		const { props } = renderOtpForm();
		await user.press(screen.getByText("別のメールアドレスで試す"));
		expect(props.onReset).toHaveBeenCalledTimes(1);
	});
});
