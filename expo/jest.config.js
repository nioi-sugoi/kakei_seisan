/** @type {import('jest').Config} */
module.exports = {
	preset: "jest-expo",
	transformIgnorePatterns: [
		// pnpm のネスト構造に対応するため、全ての node_modules 内を一律で
		// 変換対象にするかどうかを package 名で判定する
		"node_modules/(?!(.pnpm|react-native|@react-native|expo|@expo|jest-expo|expo-modules-core|nativewind|react-native-css-interop)(/|$))",
	],
};
