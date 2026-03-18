import path from "node:path";
import { defineConfig } from "vitest/config";

const dir = import.meta.dirname;

export default defineConfig({
	test: {
		globals: true,
		setupFiles: ["./test/setup-resolve.ts", "./test/setup.ts"],
	},
	resolve: {
		alias: {
			"@": dir,
			"react-native": path.resolve(dir, "test/mocks/react-native.ts"),
		},
	},
});
