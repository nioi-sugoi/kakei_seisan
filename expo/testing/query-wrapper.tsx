import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * テスト用の QueryClientProvider ラッパーを生成する。
 * 返り値の wrapper を RNTL の render に渡し、cleanup で afterEach のキャッシュ破棄を行う。
 *
 * @example
 * const { wrapper, cleanup } = createQueryWrapper();
 * render(<MyScreen />, { wrapper });
 * // afterEach で cleanup() を呼ぶ
 */
export function createQueryWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false, gcTime: 0 },
		},
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const cleanup = () => queryClient.clear();

	return { wrapper, cleanup };
}
