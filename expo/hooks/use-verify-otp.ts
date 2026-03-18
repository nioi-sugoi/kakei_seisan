import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { compactOtp } from "@/components/auth/otp-form";

export function useVerifyOtp() {
	const { email } = useLocalSearchParams<{ email: string }>();
	const router = useRouter();
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const safeEmail = email ?? "";

	// email パラメータがない場合はログインに戻す
	if (!safeEmail) {
		router.replace("/(auth)/login");
	}

	const verifyOtp = useCallback(async () => {
		const code = compactOtp(otp);
		if (!code) {
			setError("認証コードを入力してください");
			return;
		}

		setError("");
		setLoading(true);

		try {
			const { error: apiError } = await authClient.signIn.emailOtp({
				email: safeEmail,
				otp: code,
			});

			if (apiError) {
				const message =
					apiError.code === "OTP_EXPIRED"
						? "コードの有効期限が切れています"
						: apiError.code === "INVALID_OTP"
							? "コードが正しくありません"
							: (apiError.message ?? "認証に失敗しました");
				setError(message);
				return;
			}
			// セッション確立後、useProtectedRoute が自動で (tabs) にリダイレクト
		} catch {
			setError("ネットワークエラーが発生しました");
		} finally {
			setLoading(false);
		}
	}, [safeEmail, otp]);

	const resendOtp = useCallback(async () => {
		setError("");
		setLoading(true);
		try {
			const { error: apiError } =
				await authClient.emailOtp.sendVerificationOtp({
					email: safeEmail,
					type: "sign-in",
				});
			if (apiError) {
				setError(apiError.message ?? "再送信に失敗しました");
				return;
			}
			setOtp("");
		} catch {
			setError("ネットワークエラーが発生しました");
		} finally {
			setLoading(false);
		}
	}, [safeEmail]);

	const goBack = useCallback(() => {
		router.back();
	}, [router]);

	return {
		email: safeEmail,
		otp,
		setOtp,
		error,
		loading,
		verifyOtp,
		resendOtp,
		goBack,
	};
}
