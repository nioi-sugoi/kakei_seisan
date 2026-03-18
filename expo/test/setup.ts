/**
 * RNTL カスタムマッチャーのセットアップ
 *
 * setup-resolve.ts で Module._resolveFilename パッチが適用済みの状態で
 * ロードされるため、matchers の react-native 依存は mock に解決される。
 */
import * as matchers from "@testing-library/react-native/matchers";

expect.extend(matchers);
