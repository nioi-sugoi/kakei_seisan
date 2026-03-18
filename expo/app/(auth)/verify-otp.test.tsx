import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";

jest.mock("expo-router", () => ({
	useLocalSearchParams: () => ({ email: "test@example.com" }),
	useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/lib/auth-client", () => ({
	authClient: {
		signIn: { emailOtp: jest.fn() },
		emailOtp: { sendVerificationOtp: jest.fn() },
	},
}));

import VerifyOtpScreen from "./verify-otp";
import { authClient } from "@/lib/auth-client";

const mockSignInEmailOtp = authClient.signIn.emailOtp as jest.Mock;
const mockSendVerificationOtp = authClient.emailOtp
	.sendVerificationOtp as jest.Mock;

const user = userEvent.setup();

async function fillOtp(code: string) {
	fireEvent.changeText(screen.getByTestId("otp-input-0"), code);
	await waitFor(() => {
		expect(screen.getByTestId("otp-input-0")).toHaveProp(
			"value",
			code[0],
		);
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	mockSignInEmailOtp.mockResolvedValue({ error: null });
	mockSendVerificationOtp.mockResolvedValue({ error: null });
});

describe("VerifyOtpScreen", () => {
	// --- バリデーション ---

	it("未入力で認証ボタンを押すとエラーが表示される", async () => {
		render(<VerifyOtpScreen />);

		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(
				screen.getByText("認証コードを入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockSignInEmailOtp).not.toHaveBeenCalled();
	});

	// --- 認証成功 ---

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
});
