/** @type {import('jest').Config} */
module.exports = {
	preset: "jest-expo",
	setupFiles: ["./jest.setup.js"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	transformIgnorePatterns: [
		"node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|jest-expo|expo-modules-core|nativewind|react-native-css-interop|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-svg|@react-navigation)(/|$))",
	],
};
