import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useLoginForm() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);
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

	const submit = useCallback(async () => {
		const validationError = validate(email);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError("");
		setLoading(true);

		try {
			const { error: apiError } = await authClient.signIn.magicLink({
				email: email.trim(),
				callbackURL: "/",
			});

			if (apiError) {
				setError(apiError.message ?? "送信に失敗しました");
				setLoading(false);
				return;
			}

			setLoading(false);
			setSent(true);
		} catch {
			setError("ネットワークエラーが発生しました");
			setLoading(false);
		}
	}, [email, validate]);

	const reset = useCallback(() => {
		setEmail("");
		setError("");
		setSent(false);
		setLoading(false);
	}, []);

	return { email, setEmail, error, setError, sent, loading, submit, reset };
}
