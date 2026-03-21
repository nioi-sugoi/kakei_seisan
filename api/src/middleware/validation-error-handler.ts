import type { Context } from "hono";
import type { GenericSchema, SafeParseResult } from "valibot";

/**
 * vValidator の第3引数に渡す共通のバリデーションエラーハンドラ。
 * バリデーション失敗時に 400 レスポンスを返す。
 */
export function handleValidationError(
	result: SafeParseResult<GenericSchema>,
	c: Context,
) {
	if (!result.success) {
		return c.json(
			{
				error: "バリデーションエラー" as const,
				issues: result.issues.map((issue) => ({
					field: String(issue.path?.[0]?.key ?? "unknown"),
					message: issue.message,
				})),
			},
			400,
		);
	}
}
