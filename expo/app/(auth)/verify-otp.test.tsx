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

function getOtpInput(index: number) {
	return screen.getByTestId(`otp-input-${index}`);
}

async function fillOtp(code: string) {
	fireEvent.changeText(getOtpInput(0), code);
	await waitFor(() => {
		expect(getOtpInput(0)).toHaveProp("value", code[0]);
	});
}

async function submitOtp() {
	await user.press(screen.getByText("認証する"));
}

beforeEach(() => {
	jest.clearAllMocks();
	mockSignInEmailOtp.mockResolvedValue({ error: null });
	mockSendVerificationOtp.mockResolvedValue({ error: null });
});

describe("VerifyOtpScreen", () => {
	// --- 入力 → 認証の一連フロー ---

	it("6桁入力して認証するとAPIが正しい値で呼ばれる", async () => {
		render(<VerifyOtpScreen />);

		await fillOtp("123456");
		await submitOtp();

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	it("途中の桁にペーストしても正しい値がAPIに渡る", async () => {
		render(<VerifyOtpScreen />);

		// 先頭3桁 + 後半3桁を別々に入力
		fireEvent.changeText(getOtpInput(0), "123");
		await waitFor(() => {
			expect(getOtpInput(0)).toHaveProp("value", "1");
		});
		fireEvent.changeText(getOtpInput(3), "456");
		await waitFor(() => {
			expect(getOtpInput(3)).toHaveProp("value", "4");
		});

		await submitOtp();

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	it("非数字を含む入力は数字のみがAPIに渡る", async () => {
		render(<VerifyOtpScreen />);

		// "a1b2c3" → cleaned="123" → 3桁しか入らない
		fireEvent.changeText(getOtpInput(0), "a1b2c3");
		await waitFor(() => {
			expect(getOtpInput(0)).toHaveProp("value", "1");
		});
		// 残り3桁を追加
		fireEvent.changeText(getOtpInput(3), "456");
		await waitFor(() => {
			expect(getOtpInput(3)).toHaveProp("value", "4");
		});

		await submitOtp();

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

		await submitOtp();

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
		await submitOtp();

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
		await submitOtp();

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
		await submitOtp();

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
