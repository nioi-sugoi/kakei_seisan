const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// git worktree が .claude/worktrees/ 内にある場合、
// Watchman がドットディレクトリを除外するため projectRoot を明示する
config.projectRoot = __dirname;
config.watchFolders = [path.resolve(__dirname, "..")];

module.exports = withNativeWind(config, { input: "./global.css" });
