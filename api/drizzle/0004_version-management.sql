-- バージョン管理方式への移行: entries テーブル
-- operation/parent_id → original_id/cancelled/latest

-- 1. entries テーブルの再作成
CREATE TABLE "entries_new" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "user"("id"),
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"date" text NOT NULL,
	"label" text NOT NULL,
	"memo" text,
	"original_id" text NOT NULL REFERENCES "entries_new"("id"),
	"cancelled" integer NOT NULL DEFAULT 0,
	"latest" integer NOT NULL DEFAULT 1,
	"status" text NOT NULL DEFAULT 'approved',
	"approved_by" text REFERENCES "user"("id"),
	"approved_at" integer,
	"approval_comment" text,
	"created_at" integer NOT NULL,
	CHECK ("category" IN ('advance', 'deposit')),
	CHECK ("status" IN ('approved', 'pending', 'rejected')),
	CHECK ("amount" >= 0)
);--> statement-breakpoint

-- 2. 既存データの移行（original レコードのみ、original_id = 自身の id）
INSERT INTO "entries_new" (
	"id", "user_id", "category", "amount", "date", "label", "memo",
	"original_id", "cancelled", "latest",
	"status", "approved_by", "approved_at", "approval_comment",
	"created_at"
)
SELECT
	"id", "user_id", "category", "amount", "date", "label", "memo",
	"id", 0, 1,
	"status", "approved_by", "approved_at", "approval_comment",
	"created_at"
FROM "entries"
WHERE "operation" = 'original';--> statement-breakpoint

-- 3. 旧テーブルの削除と新テーブルのリネーム
DROP TABLE "entries";--> statement-breakpoint
ALTER TABLE "entries_new" RENAME TO "entries";--> statement-breakpoint

-- 4. インデックスの再作成
CREATE INDEX "entries_user_status_idx" ON "entries" ("user_id", "status");--> statement-breakpoint
CREATE INDEX "entries_user_date_idx" ON "entries" ("user_id", "date");--> statement-breakpoint
CREATE INDEX "entries_user_created_idx" ON "entries" ("user_id", "created_at");--> statement-breakpoint
CREATE INDEX "entries_original_idx" ON "entries" ("original_id");--> statement-breakpoint
CREATE INDEX "entries_user_latest_idx" ON "entries" ("user_id", "latest");--> statement-breakpoint

-- 5. settlements テーブルの再作成（同じバージョン管理構造）
CREATE TABLE "settlements_new" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "user"("id"),
	"amount" integer NOT NULL,
	"date" text NOT NULL,
	"original_id" text NOT NULL REFERENCES "settlements_new"("id"),
	"cancelled" integer NOT NULL DEFAULT 0,
	"latest" integer NOT NULL DEFAULT 1,
	"status" text NOT NULL DEFAULT 'approved',
	"approved_by" text REFERENCES "user"("id"),
	"approved_at" integer,
	"approval_comment" text,
	"created_at" integer NOT NULL,
	CHECK ("status" IN ('approved', 'pending', 'rejected')),
	CHECK ("amount" >= 0)
);--> statement-breakpoint

INSERT INTO "settlements_new" (
	"id", "user_id", "amount", "date",
	"original_id", "cancelled", "latest",
	"status", "approved_by", "approved_at", "approval_comment",
	"created_at"
)
SELECT
	"id", "user_id", "amount", "date",
	"id", 0, 1,
	"status", "approved_by", "approved_at", "approval_comment",
	"created_at"
FROM "settlements"
WHERE "operation" = 'original';--> statement-breakpoint

DROP TABLE "settlements";--> statement-breakpoint
ALTER TABLE "settlements_new" RENAME TO "settlements";--> statement-breakpoint

CREATE INDEX "settlements_user_status_idx" ON "settlements" ("user_id", "status");--> statement-breakpoint
CREATE INDEX "settlements_user_date_idx" ON "settlements" ("user_id", "date");--> statement-breakpoint
CREATE INDEX "settlements_original_idx" ON "settlements" ("original_id");--> statement-breakpoint
CREATE INDEX "settlements_user_latest_idx" ON "settlements" ("user_id", "latest");
