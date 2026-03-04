import { expoClient } from "@better-auth/expo/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { config } from "./config";

export const authClient = createAuthClient({
	baseURL: config.apiBaseUrl,
	plugins: [
		expoClient({
			scheme: "kakei-seisan",
			storagePrefix: "kakei-seisan",
			storage: SecureStore,
		}),
		magicLinkClient(),
	],
});
