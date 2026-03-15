import { getSetCookie } from "@better-auth/expo/client";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * expoClient の storagePrefix と一致させる。
 * cookie は "${STORAGE_PREFIX}_cookie" キーに JSON で保存される。
 */
const STORAGE_PREFIX = "kakei-seisan";
const COOKIE_KEY = `${STORAGE_PREFIX}_cookie`;

/**
 * Better Auth のマジックリンクコールバックで受け取るディープリンクを処理する。
 *
 * expoClient は OAuth フロー（openAuthSessionAsync）の cookie 処理は内蔵しているが、
 * マジックリンク（メールアプリ → システムブラウザ → ディープリンク）の cookie 処理は
 * 提供していないため、このフックで補完する。
 *
 * フロー:
 *   1. メール内リンクをタップ → ブラウザでサーバーがトークン検証
 *   2. サーバーが Set-Cookie ヘッダーの値を deep link URL の cookie パラメータに付加
 *   3. このフックが cookie パラメータを解析し SecureStore に保存
 *   4. セッションが確立され useProtectedRoute が (tabs) にリダイレクト
 */
export function useDeepLinkAuth() {
	const router = useRouter();
	const processing = useRef(false);

	useEffect(() => {
		async function handleUrl(url: string) {
			if (processing.current) return;

			const parsed = Linking.parse(url);
			const params = parsed.queryParams;
			if (!params) return;

			// エラーケース: マジックリンク検証失敗
			if (params.error) {
				// expo-router の組み込み URL ルーティングが同時にルートへの
				// ナビゲーションを発火するため、それが完了してから遷移する
				setTimeout(() => {
					router.replace({
						pathname: "/(auth)/verify-magic-link",
						params: { error: String(params.error) },
					});
				}, 100);
				return;
			}

			// 成功ケース: cookie パラメータからセッションを復元
			if (params.cookie) {
				processing.current = true;
				try {
					// expoClient と同じ形式で SecureStore に保存
					// getSetCookie は Set-Cookie ヘッダー文字列を JSON に変換する
					const prevCookie =
						SecureStore.getItem(COOKIE_KEY) ?? undefined;
					const newCookie = getSetCookie(
						String(params.cookie),
						prevCookie,
					);
					SecureStore.setItem(COOKIE_KEY, newCookie);

					// セッション状態を更新（useSession が再レンダリングをトリガー）
					await authClient.getSession();
				} finally {
					processing.current = false;
				}
			}
		}

		// アプリ実行中にディープリンクを受信した場合
		const subscription = Linking.addEventListener("url", (event) => {
			handleUrl(event.url);
		});

		// コールドスタート: アプリがディープリンクで起動された場合
		Linking.getInitialURL().then((url) => {
			if (url) handleUrl(url);
		});

		return () => subscription.remove();
	}, [router]);
}
