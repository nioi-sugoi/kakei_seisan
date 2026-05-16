import "../global.css";

import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";

import { useProtectedRoute } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { queryClient } from "@/lib/query-client";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
	anchor: "(tabs)",
};

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const { isPending } = useProtectedRoute();
	const hasLoaded = useRef(false);

	useEffect(() => {
		if (!isPending) {
			hasLoaded.current = true;
			SplashScreen.hideAsync();
		}
	}, [isPending]);

	// 初回ロード中のみ null を返す。
	// セッション再フェッチ時は Stack を維持してナビゲーション履歴を保持する。
	if (isPending && !hasLoaded.current) {
		return null;
	}

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Stack>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="(auth)" options={{ headerShown: false }} />
					<Stack.Screen
						name="entry-form"
						options={{
							headerShown: false,
							presentation: "modal",
						}}
					/>
					<Stack.Screen
						name="modify-entry/[id]"
						options={{
							headerShown: false,
							presentation: "modal",
						}}
					/>
					<Stack.Screen
						name="entry-detail/[id]"
						options={{
							headerShown: false,
						}}
					/>
					<Stack.Screen
						name="settlement-form"
						options={{
							headerShown: false,
							presentation: "modal",
						}}
					/>
					<Stack.Screen
						name="modify-settlement/[id]"
						options={{
							headerShown: false,
							presentation: "modal",
						}}
					/>
					<Stack.Screen
						name="settlement-detail/[id]"
						options={{
							headerShown: false,
						}}
					/>
					<Stack.Screen
						name="partner-entry-detail/[id]"
						options={{
							headerShown: false,
						}}
					/>
					<Stack.Screen
						name="partner-settlement-detail/[id]"
						options={{
							headerShown: false,
						}}
					/>
				</Stack>
				<StatusBar style="auto" />
			</ThemeProvider>
		</QueryClientProvider>
	);
}
