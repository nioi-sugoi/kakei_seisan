import type { AppType } from "@api/index";
import { hc } from "hono/client";
import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { config } from "./config";

function getAuthHeaders(): Record<string, string> {
	if (Platform.OS === "web") {
		return {};
	}
	const cookie = authClient.getCookie();
	if (cookie) {
		return { Cookie: cookie };
	}
	return {};
}

export const client = hc<AppType>(config.apiBaseUrl, {
	fetch: async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const authHeaders = getAuthHeaders();
		const headers = new Headers(init?.headers);
		for (const [key, value] of Object.entries(authHeaders)) {
			headers.set(key, value);
		}
		return fetch(input, {
			...init,
			headers,
			credentials: "include",
		});
	},
});
