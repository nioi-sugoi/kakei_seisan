import type { AppType } from "@api/index";
import { hc } from "hono/client";
import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { config } from "./config";

export async function throwIfError(
	res: { ok: boolean; json: () => Promise<unknown> },
	fallbackMessage: string,
): Promise<void> {
	if (res.ok) return;
	let message = fallbackMessage;
	try {
		const body: unknown = await res.json();
		if (
			typeof body === "object" &&
			body !== null &&
			"error" in body &&
			typeof (body as { error: unknown }).error === "string"
		) {
			message = (body as { error: string }).error;
		}
	} catch {
		// JSON パースに失敗した場合はフォールバックメッセージを使う
	}
	throw new Error(message);
}

export const client = hc<AppType>(config.apiBaseUrl, {
	fetch: async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const headers = new Headers(init?.headers);
		if (Platform.OS !== "web") {
			const cookie = authClient.getCookie();
			if (cookie) {
				headers.set("Cookie", cookie);
			}
		}
		return fetch(input, {
			...init,
			headers,
			credentials: "include",
		});
	},
});
