import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * テスト用の QueryClientProvider ラッパーを生成する。
 * 呼び出しごとに新しい QueryClient を作るためキャッシュは自然に分離される。
 *
 * @example
 * render(<MyScreen />, { wrapper: createQueryWrapper() });
 */
export function createQueryWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false, gcTime: 0 },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
