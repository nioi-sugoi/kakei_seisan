-- ALTER TABLE RENAMEで自己参照FKの参照先テーブル名が更新されなかった問題を修正
-- entry_versions.original_id が旧名 entries(id) を参照しているのを entry_versions(id) に修正
-- settlement_versions.original_id が旧名 settlements(id) を参照しているのを settlement_versions(id) に修正
-- 開発用DBにデータ保全の必要はないため、DROP + CREATE で再作成する

-- 1. FK依存テーブルを先にDROP
DROP TABLE IF EXISTS "entry_image_versions";
--> statement-breakpoint
DROP TABLE IF EXISTS "settlement_image_versions";
--> statement-breakpoint

-- 2. 自己参照FKが壊れているテーブルをDROP
DROP TABLE IF EXISTS "entry_versions";
--> statement-breakpoint
DROP TABLE IF EXISTS "settlement_versions";
--> statement-breakpoint

-- 3. entry_versions を正しいFK定義で再作成
CREATE TABLE "entry_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "user"("id"),
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"occurred_on" text NOT NULL,
	"label" text NOT NULL,
	"memo" text,
	"original_id" text NOT NULL REFERENCES "entry_versions"("id"),
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
);
--> statement-breakpoint

-- 4. settlement_versions を正しいFK定義で再作成
CREATE TABLE "settlement_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "user"("id"),
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"occurred_on" text NOT NULL,
	"original_id" text NOT NULL REFERENCES "settlement_versions"("id"),
	"cancelled" integer NOT NULL DEFAULT 0,
	"latest" integer NOT NULL DEFAULT 1,
	"status" text NOT NULL DEFAULT 'approved',
	"approved_by" text REFERENCES "user"("id"),
	"approved_at" integer,
	"approval_comment" text,
	"created_at" integer NOT NULL,
	CHECK ("category" IN ('fromUser', 'fromHousehold')),
	CHECK ("status" IN ('approved', 'pending', 'rejected')),
	CHECK ("amount" >= 0)
);
--> statement-breakpoint

-- 5. entry_image_versions を再作成
CREATE TABLE "entry_image_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_version_id" text NOT NULL REFERENCES "entry_versions"("id"),
	"storage_path" text NOT NULL,
	"display_order" integer NOT NULL DEFAULT 0,
	"created_at" integer NOT NULL
);
--> statement-breakpoint

-- 6. settlement_image_versions を再作成
CREATE TABLE "settlement_image_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"settlement_version_id" text NOT NULL REFERENCES "settlement_versions"("id"),
	"storage_path" text NOT NULL,
	"display_order" integer NOT NULL DEFAULT 0,
	"created_at" integer NOT NULL
);
--> statement-breakpoint

-- 7. インデックスの再作成
CREATE INDEX "entry_versions_user_status_idx" ON "entry_versions" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX "entry_versions_user_occurred_on_idx" ON "entry_versions" ("user_id", "occurred_on");
--> statement-breakpoint
CREATE INDEX "entry_versions_user_created_idx" ON "entry_versions" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "entry_versions_original_idx" ON "entry_versions" ("original_id");
--> statement-breakpoint
CREATE INDEX "entry_versions_original_created_idx" ON "entry_versions" ("original_id", "created_at");
--> statement-breakpoint
CREATE INDEX "entry_versions_user_latest_idx" ON "entry_versions" ("user_id", "latest");
--> statement-breakpoint
CREATE UNIQUE INDEX "entry_versions_one_latest_per_original" ON "entry_versions" ("original_id") WHERE "latest" = 1;
--> statement-breakpoint
CREATE INDEX "settlement_versions_user_status_idx" ON "settlement_versions" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX "settlement_versions_user_occurred_on_idx" ON "settlement_versions" ("user_id", "occurred_on");
--> statement-breakpoint
CREATE INDEX "settlement_versions_user_created_idx" ON "settlement_versions" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "settlement_versions_original_idx" ON "settlement_versions" ("original_id");
--> statement-breakpoint
CREATE INDEX "settlement_versions_user_latest_idx" ON "settlement_versions" ("user_id", "latest");
--> statement-breakpoint
CREATE INDEX "settlement_versions_original_created_idx" ON "settlement_versions" ("original_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_versions_one_latest_per_original" ON "settlement_versions" ("original_id") WHERE "latest" = 1;
--> statement-breakpoint
CREATE INDEX "entry_image_versions_entry_idx" ON "entry_image_versions" ("entry_version_id");
--> statement-breakpoint
CREATE INDEX "settlement_image_versions_settlement_idx" ON "settlement_image_versions" ("settlement_version_id");
