import "../global.css";

import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useProtectedRoute } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeepLinkAuth } from "@/hooks/use-deep-link-auth";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
	anchor: "(tabs)",
};

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const { isPending } = useProtectedRoute();
	useDeepLinkAuth();

	useEffect(() => {
		if (!isPending) {
			SplashScreen.hideAsync();
		}
	}, [isPending]);

	if (isPending) {
		return null;
	}

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
			</Stack>
			<StatusBar style="auto" />
		</ThemeProvider>
	);
}
