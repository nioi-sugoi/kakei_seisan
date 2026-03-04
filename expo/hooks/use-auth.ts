import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function useProtectedRoute() {
	const { data: session, isPending } = authClient.useSession();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (isPending) return;

		const inAuthGroup = segments[0] === "(auth)";
		const isSignedIn = !!session?.user;

		if (!isSignedIn && !inAuthGroup) {
			router.replace("/(auth)/login");
		} else if (isSignedIn && inAuthGroup) {
			router.replace("/(tabs)");
		}
	}, [session, isPending, segments, router]);

	return { session, isPending };
}
