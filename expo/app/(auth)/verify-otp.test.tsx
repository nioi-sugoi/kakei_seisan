import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";

jest.mock("expo-router", () => ({
	useLocalSearchParams: jest.fn(),
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

const mockSignInEmailOtp = jest.mocked(authClient.signIn.emailOtp);
const mockSendVerificationOtp = jest.mocked(
	authClient.emailOtp.sendVerificationOtp,
);
const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const mockUseRouter = jest.mocked(useRouter);

/** 指定桁に数字のみのOTPを入力し、状態反映を待つ */
async function fillOtpAt(index: number, code: string) {
	fireEvent.changeText(screen.getByTestId(`otp-input-${index}`), code);
	const stripped = code.replace(/\s/g, "");
	if (stripped && !/\D/.test(stripped)) {
		await waitFor(() => {
			expect(screen.getByTestId(`otp-input-${index}`)).toHaveProp(
				"value",
				stripped[0],
			);
		});
	}
}

const mockReplace = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	mockUseLocalSearchParams.mockReturnValue({ email: "test@example.com" });
	// テストで使用するメソッドのみモック（Router 型は他にも多数のメソッドを要求するため as で絞る）
	mockUseRouter.mockReturnValue({
		replace: mockReplace,
		back: jest.fn(),
	} as unknown as ReturnType<typeof useRouter>);
	mockSignInEmailOtp.mockResolvedValue({ error: null });
	mockSendVerificationOtp.mockResolvedValue({ error: null });
});

describe("VerifyOtpScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- 入力 → 認証の一連フロー ---

	it("1文字ずつ入力して認証するとAPIが正しい値で呼ばれる", async () => {
		render(<VerifyOtpScreen />);

		// フォーカス移動はRNTLでは動作しないため、各桁に個別入力
		for (let i = 0; i < 6; i++) {
			await user.type(screen.getByTestId(`otp-input-${i}`), String(i + 1));
		}
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	it("6桁ペーストして認証するとAPIが正しい値で呼ばれる", async () => {
		render(<VerifyOtpScreen />);

		await fillOtpAt(0, "123456");
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

		await fillOtpAt(0, "123");
		await fillOtpAt(3, "456");
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(mockSignInEmailOtp).toHaveBeenCalledWith({
				email: "test@example.com",
				otp: "123456",
			});
		});
	});

	it("非数字を含むペーストは無視される", async () => {
		render(<VerifyOtpScreen />);

		fireEvent.changeText(screen.getByTestId("otp-input-0"), "a1b2c3");
		await user.press(screen.getByText("認証する"));

		await waitFor(() => {
			expect(
				screen.getByText("認証コードを入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockSignInEmailOtp).not.toHaveBeenCalled();
	});

	it("空白を含む数字のペーストは空白が除去されてAPIに渡る", async () => {
		render(<VerifyOtpScreen />);

		await fillOtpAt(0, "1 2 3 4 5 6");
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

		await fillOtpAt(0, "111111");
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

		await fillOtpAt(0, "000000");
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

		await fillOtpAt(0, "123456");
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

	// --- ナビゲーション ---

	it("emailパラメータがない場合ログイン画面にリダイレクトする", () => {
		mockUseLocalSearchParams.mockReturnValue({});
		render(<VerifyOtpScreen />);

		expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
	});
});
