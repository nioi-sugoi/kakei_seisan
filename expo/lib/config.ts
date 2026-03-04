import Constants from "expo-constants";
import { Platform } from "react-native";

const DEV_API_PORT = 8787;

function getApiBaseUrl(): string {
	if (process.env.EXPO_PUBLIC_API_URL) {
		return process.env.EXPO_PUBLIC_API_URL;
	}

	if (__DEV__) {
		if (Platform.OS === "web") {
			return `http://localhost:${DEV_API_PORT}`;
		}
		const hostUri = Constants.expoConfig?.hostUri;
		if (hostUri) {
			const host = hostUri.split(":")[0];
			return `http://${host}:${DEV_API_PORT}`;
		}
		return `http://localhost:${DEV_API_PORT}`;
	}

	// Production
	if (Platform.OS === "web") {
		return "";
	}
	return "https://api.kakei-seisan.example.com";
}

export const config = {
	apiBaseUrl: getApiBaseUrl(),
} as const;
