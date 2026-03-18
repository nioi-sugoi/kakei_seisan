/**
 * react-native のモック
 *
 * Node.js 上では react-native は直接 import できない（Flow 構文 + ネイティブモジュール依存）。
 * resolve alias で本モジュールに差し替え、react-test-renderer が
 * 文字列型をホストコンポーネントとして扱う仕組みを利用する。
 */
import { createElement, forwardRef, type Ref } from "react";

function createMockComponent<P extends Record<string, unknown>>(name: string) {
	const component = forwardRef((props: P, ref: Ref<unknown>) =>
		createElement(name, { ...props, ref }),
	);
	component.displayName = name;
	return component;
}

export const View = createMockComponent("View");
export const Text = createMockComponent("Text");
export const TextInput = createMockComponent("TextInput");
export const Pressable = createMockComponent("Pressable");
export const ActivityIndicator = createMockComponent("ActivityIndicator");
export const ScrollView = createMockComponent("ScrollView");
export const Image = createMockComponent("Image");

export const StyleSheet = {
	create: <T extends Record<string, unknown>>(styles: T): T => styles,
	flatten: (
		style:
			| Record<string, unknown>
			| Array<Record<string, unknown> | undefined>
			| undefined,
	): Record<string, unknown> | undefined => {
		if (!style) return undefined;
		if (Array.isArray(style))
			return Object.assign({}, ...style.filter(Boolean));
		return style;
	},
};

export const Platform = {
	OS: "ios" as const,
	select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined =>
		obj.ios ?? obj.default,
	Version: 17,
};
