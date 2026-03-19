import type { AppType } from "@api/index";
import { hc } from "hono/client";
import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { config } from "./config";

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
