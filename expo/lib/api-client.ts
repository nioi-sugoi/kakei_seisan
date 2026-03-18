import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { config } from "./config";

async function getAuthHeaders(): Promise<Record<string, string>> {
	// Web版ではブラウザの標準Cookie機構を使うためヘッダー付与不要
	if (Platform.OS === "web") {
		return {};
	}
	try {
		const cookieStr = await SecureStore.getItemAsync("kakei-seisan.cookie");
		if (cookieStr) {
			return { Cookie: cookieStr };
		}
	} catch {
		// SecureStore が使えない環境ではスキップ
	}
	return {};
}

type ApiResponse<T> =
	| { data: T; error: null }
	| { data: null; error: { message: string; issues?: { field: string; message: string }[] } };

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
				error: { message: "サーバーから不正なレスポンスが返されました" },
			};
		}

		if (!res.ok) {
			return {
				data: null,
				error: {
					message: (json.error as string) ?? "リクエストに失敗しました",
					issues: json.issues as { field: string; message: string }[] | undefined,
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
