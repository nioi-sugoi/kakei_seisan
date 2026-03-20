import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * テスト用の QueryClientProvider ラッパーコンポーネント。
 * マウントごとに新しい QueryClient を生成するためテスト間でキャッシュが分離される。
 *
 * @example
 * render(<MyScreen />, { wrapper: TestQueryWrapper });
 */
export function TestQueryWrapper({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: false, gcTime: 0 },
					mutations: { retry: false, gcTime: 0 },
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
