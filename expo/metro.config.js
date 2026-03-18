const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// git worktree が .claude/worktrees/ 内にある場合、
// Watchman がドットディレクトリを除外するため projectRoot を明示する
config.projectRoot = __dirname;
config.watchFolders = [path.resolve(__dirname, "..")];

// pnpm ワークスペースで node_modules が分散し、同一パッケージの
// 重複インスタンスが生じる問題を解決する。
// expo/node_modules を最優先で解決するよう nodeModulesPaths を設定する。
config.resolver.nodeModulesPaths = [
	path.resolve(__dirname, "node_modules"),
	path.resolve(__dirname, "..", "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
