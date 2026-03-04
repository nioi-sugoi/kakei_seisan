import { useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function useSession() {
	return authClient.useSession();
}

export function useSignOut() {
	const [isPending, setIsPending] = useState(false);

	const signOut = useCallback(async () => {
		setIsPending(true);
		try {
			await authClient.signOut();
		} finally {
			setIsPending(false);
		}
	}, []);

	return { signOut, isPending };
}

export function useProtectedRoute() {
	const { data: session, isPending } = useSession();
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
