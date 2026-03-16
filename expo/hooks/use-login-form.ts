import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useLoginForm() {
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [loading, setLoading] = useState(false);

	const validate = useCallback((value: string): string => {
		if (!value.trim()) {
			return "メールアドレスを入力してください";
		}
		if (!EMAIL_REGEX.test(value.trim())) {
			return "正しいメールアドレスの形式で入力してください";
		}
		return "";
	}, []);

	const sendOtp = useCallback(async () => {
		const validationError = validate(email);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError("");
		setLoading(true);

		try {
			const { error: apiError } =
				await authClient.emailOtp.sendVerificationOtp({
					email: email.trim(),
					type: "sign-in",
				});

			if (apiError) {
				setError(apiError.message ?? "送信に失敗しました");
				setLoading(false);
				return;
			}

			setLoading(false);
			setOtpSent(true);
		} catch {
			setError("ネットワークエラーが発生しました");
			setLoading(false);
		}
	}, [email, validate]);

	const verifyOtp = useCallback(async () => {
		if (!otp.trim()) {
			setError("認証コードを入力してください");
			return;
		}

		setError("");
		setLoading(true);

		try {
			const { error: apiError } = await authClient.signIn.emailOtp({
				email: email.trim(),
				otp: otp.trim(),
			});

			if (apiError) {
				const message =
					apiError.code === "OTP_EXPIRED"
						? "コードの有効期限が切れています"
						: apiError.code === "INVALID_OTP"
							? "コードが正しくありません"
							: (apiError.message ?? "認証に失敗しました");
				setError(message);
				setLoading(false);
				return;
			}

			setLoading(false);
		} catch {
			setError("ネットワークエラーが発生しました");
			setLoading(false);
		}
	}, [email, otp]);

	const reset = useCallback(() => {
		setEmail("");
		setOtp("");
		setError("");
		setOtpSent(false);
		setLoading(false);
	}, []);

	return {
		email,
		setEmail,
		otp,
		setOtp,
		error,
		setError,
		otpSent,
		loading,
		sendOtp,
		verifyOtp,
		reset,
	};
}
