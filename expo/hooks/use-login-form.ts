import { useCallback, useState } from "react";

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

	const submit = useCallback(() => {
		const validationError = validate(email);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError("");
		setLoading(true);

		// 送信シミュレーション（認証ロジックは後続イシューで実装）
		setTimeout(() => {
			setLoading(false);
			setSent(true);
		}, 1500);
	}, [email, validate]);

	const reset = useCallback(() => {
		setEmail("");
		setError("");
		setSent(false);
		setLoading(false);
	}, []);

	return { email, setEmail, error, setError, sent, loading, submit, reset };
}
