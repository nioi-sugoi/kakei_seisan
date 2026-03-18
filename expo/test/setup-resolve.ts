/**
 * react-native モジュール解決のパッチ（最初に読み込む必要がある）
 *
 * Node.js の CJS require を monkey-patch して react-native を mock に差し替える。
 * vitest の resolve.alias や vi.mock は node_modules 内の CJS require チェーンを
 * 捕捉できないため、Node.js レベルでの介入が必要。
 *
 * このファイルは他の setup ファイルより先に setupFiles に指定すること。
 */

import Module from "node:module";
import path from "node:path";

const rnMockPath = path.resolve(import.meta.dirname, "mocks/react-native.ts");

const originalResolveFilename = (
	Module as unknown as { _resolveFilename: Function }
)._resolveFilename;
(Module as unknown as { _resolveFilename: Function })._resolveFilename =
	function (request: string, parent: unknown, ...args: unknown[]) {
		if (request === "react-native") {
			return rnMockPath;
		}
		return originalResolveFilename.call(this, request, parent, ...args);
	};

// React Native が期待するグローバル変数
Object.defineProperty(globalThis, "__DEV__", {
	value: true,
	writable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
