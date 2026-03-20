import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string {
	if (!email) {
		return "メールアドレスを入力してください";
	}
	if (!EMAIL_REGEX.test(email)) {
		return "正しいメールアドレスの形式で入力してください";
	}
	return "";
}

export function useLoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const sendOtp = useCallback(async () => {
		const trimmedEmail = email.trim();
		const validationError = validateEmail(trimmedEmail);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError("");
		setLoading(true);

		try {
			const { error: apiError } = await authClient.emailOtp.sendVerificationOtp(
				{
					email: trimmedEmail,
					type: "sign-in",
				},
			);

			if (apiError) {
				setError(apiError.message ?? "送信に失敗しました");
				return;
			}

			router.push({
				pathname: "/(auth)/verify-otp",
				params: { email: trimmedEmail },
			});
		} catch {
			setError("ネットワークエラーが発生しました");
		} finally {
			setLoading(false);
		}
	}, [email, router]);

	return {
		email,
		setEmail,
		error,
		loading,
		sendOtp,
	};
}
