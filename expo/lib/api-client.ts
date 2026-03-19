import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { config } from "./config";

const COOKIE_STORAGE_KEY = "kakei-seisan_cookie";

/**
 * SecureStore に保存された Better Auth の cookie JSON を
 * Cookie ヘッダー文字列に変換する。
 *
 * 保存形式: {"better-auth.session_token": {"value": "xxx", "expires": "..."}}
 * 出力形式: "better-auth.session_token=xxx"
 */
function parseCookieJson(raw: string): string {
	try {
		const parsed = JSON.parse(raw) as Record<
			string,
			{ value: string; expires: string | null }
		>;
		return Object.entries(parsed)
			.filter(
				([, v]) => !v.expires || new Date(v.expires) > new Date(),
			)
			.map(([key, v]) => `${key}=${v.value}`)
			.join("; ");
	} catch {
		return "";
	}
}

async function getAuthHeaders(): Promise<Record<string, string>> {
	if (Platform.OS === "web") {
		return {};
	}
	try {
		const raw = await SecureStore.getItemAsync(COOKIE_STORAGE_KEY);
		if (raw) {
			const cookie = parseCookieJson(raw);
			if (cookie) {
				return { Cookie: cookie };
			}
		}
	} catch {
		// SecureStore が使えない環境ではスキップ
	}
	return {};
}

type ApiResponse<T> =
	| { data: T; error: null }
	| {
			data: null;
			error: {
				message: string;
				issues?: { field: string; message: string }[];
			};
	  };

export async function apiPost<T>(
	path: string,
	body: unknown,
): Promise<ApiResponse<T>> {
	try {
		const authHeaders = await getAuthHeaders();
		const res = await fetch(`${config.apiBaseUrl}/api${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			credentials: "include",
			body: JSON.stringify(body),
		});

		let json: Record<string, unknown>;
		try {
			json = await res.json();
		} catch {
			return {
				data: null,
				error: {
					message: "サーバーから不正なレスポンスが返されました",
				},
			};
		}

		if (!res.ok) {
			return {
				data: null,
				error: {
					message:
						(json.error as string) ?? "リクエストに失敗しました",
					issues: json.issues as
						| { field: string; message: string }[]
						| undefined,
				},
			};
		}

		return { data: json as T, error: null };
	} catch {
		return {
			data: null,
			error: { message: "ネットワークエラーが発生しました" },
		};
	}
}
