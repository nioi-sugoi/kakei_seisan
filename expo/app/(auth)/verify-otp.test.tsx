import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";

jest.mock("expo-router", () => ({
	useLocalSearchParams: jest.fn(() => ({ email: "test@example.com" })),
	useRouter: jest.fn(() => ({ replace: jest.fn(), back: jest.fn() })),
}));

jest.mock("@/lib/auth-client", () => ({
	authClient: {
		signIn: { emailOtp: jest.fn() },
		emailOtp: { sendVerificationOtp: jest.fn() },
	},
}));

import VerifyOtpScreen from "./verify-otp";
import { authClient } from "@/lib/auth-client";
import { useLocalSearchParams, useRouter } from "expo-router";

const mockSignInEmailOtp = authClient.signIn.emailOtp as jest.Mock;
const mockSendVerificationOtp = authClient.emailOtp
	.sendVerificationOtp as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

async function fillOtp(code: string) {
	fireEvent.changeText(screen.getByTestId("otp-input-0"), code);
	await waitFor(() => {
		expect(screen.getByTestId("otp-input-0")).toHaveProp(
			"value",
			code.replace(/\D/g, "")[0],
		);
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	mockUseLocalSearchParams.mockReturnValue({ email: "test@example.com" });
	mockSignInEmailOtp.mockResolvedValue({ error: null });
	mockSendVerificationOtp.mockResolvedValue({ error: null });
});

describe("VerifyOtpScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- 入力 → 認証の一連フロー ---

	it("6桁入力して認証するとAPIが正しい値で呼ばれる", async () => {
		render(<VerifyOtpScreen />);

		await fillOtp("123456");
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	it("途中の桁にペーストしても正しい値がAPIに渡る", async () => {
		render(<VerifyOtpScreen />);

		fireEvent.changeText(screen.getByTestId("otp-input-0"), "123");
		await waitFor(() => {
			expect(screen.getByTestId("otp-input-0")).toHaveProp("value", "1");
		});
		fireEvent.changeText(screen.getByTestId("otp-input-3"), "456");
		await waitFor(() => {
			expect(screen.getByTestId("otp-input-3")).toHaveProp("value", "4");
		});

		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	it("非数字を含む入力は数字のみがAPIに渡る", async () => {
		render(<VerifyOtpScreen />);

		fireEvent.changeText(screen.getByTestId("otp-input-0"), "a1b2c3");
		await waitFor(() => {
			expect(screen.getByTestId("otp-input-0")).toHaveProp("value", "1");
		});
		fireEvent.changeText(screen.getByTestId("otp-input-3"), "456");
		await waitFor(() => {
			expect(screen.getByTestId("otp-input-3")).toHaveProp("value", "4");
		});

		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	// --- バリデーション ---

	it("未入力で認証ボタンを押すとエラーが表示されAPIは呼ばれない", async () => {
		render(<VerifyOtpScreen />);

		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(
				screen.getByText("認証コードを入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockSignInEmailOtp).not.toHaveBeenCalled();
	});

	// --- APIエラー ---

	it("OTP期限切れエラーが表示される", async () => {
		mockSignInEmailOtp.mockResolvedValue({
			error: { code: "OTP_EXPIRED" },
		});
		render(<VerifyOtpScreen />);

		await fillOtp("111111");
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(
				screen.getByText("コードの有効期限が切れています"),
			).toBeOnTheScreen();
		});
	});

	it("無効なOTPエラーが表示される", async () => {
		mockSignInEmailOtp.mockResolvedValue({
			error: { code: "INVALID_OTP" },
		});
		render(<VerifyOtpScreen />);

		await fillOtp("000000");
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(
				screen.getByText("コードが正しくありません"),
			).toBeOnTheScreen();
		});
	});

	it("ネットワークエラーが表示される", async () => {
		mockSignInEmailOtp.mockRejectedValue(new Error("network"));
		render(<VerifyOtpScreen />);

		await fillOtp("123456");
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(
				screen.getByText("ネットワークエラーが発生しました"),
			).toBeOnTheScreen();
		});
	});

	// --- 再送信 ---

	it("コード再送信でAPIが呼ばれる", async () => {
		render(<VerifyOtpScreen />);

		await user.press(screen.getByText("コードを再送信"));

		await waitFor(() => {
			expect(mockSendVerificationOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				type: "sign-in",
			});
		});
	});

	it("再送信APIエラー時にエラーメッセージが表示される", async () => {
		mockSendVerificationOtp.mockResolvedValue({
			error: { message: "送信制限に達しました" },
		});
		render(<VerifyOtpScreen />);

		await user.press(screen.getByText("コードを再送信"));

		await waitFor(() => {
			expect(
				screen.getByText("送信制限に達しました"),
			).toBeOnTheScreen();
		});
	});

	// --- ナビゲーション ---

	it("emailパラメータがない場合ログイン画面にリダイレクトする", () => {
		mockUseLocalSearchParams.mockReturnValue({});
		render(<VerifyOtpScreen />);

		const router = (useRouter as jest.Mock).mock.results[0].value;
		expect(router.replace).toHaveBeenCalledWith("/(auth)/login");
	});

	it("「別のメールアドレスで試す」で前の画面に戻る", async () => {
		render(<VerifyOtpScreen />);

		await user.press(screen.getByText("別のメールアドレスで試す"));

		const router = (useRouter as jest.Mock).mock.results[0].value;
		expect(router.back).toHaveBeenCalled();
	});
});
