PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`occurred_on` text NOT NULL,
	`original_id` text NOT NULL,
	`cancelled` integer DEFAULT false NOT NULL,
	`latest` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`approval_comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`original_id`) REFERENCES `settlements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "settlements_category_check" CHECK("__new_settlements"."category" IN ('fromUser', 'fromHousehold')),
	CONSTRAINT "settlements_status_check" CHECK("__new_settlements"."status" IN ('approved', 'pending', 'rejected')),
	CONSTRAINT "settlements_amount_check" CHECK("__new_settlements"."amount" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_settlements`("id", "user_id", "category", "amount", "occurred_on", "original_id", "cancelled", "latest", "status", "approved_by", "approved_at", "approval_comment", "created_at") SELECT "id", "user_id", "category", "amount", "occurred_on", "original_id", "cancelled", "latest", "status", "approved_by", "approved_at", "approval_comment", "created_at" FROM `settlements`;--> statement-breakpoint
DROP TABLE `settlements`;--> statement-breakpoint
ALTER TABLE `__new_settlements` RENAME TO `settlements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `settlements_user_status_idx` ON `settlements` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `settlements_user_occurred_on_idx` ON `settlements` (`user_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `settlements_original_idx` ON `settlements` (`original_id`);--> statement-breakpoint
CREATE INDEX `settlements_user_latest_idx` ON `settlements` (`user_id`,`latest`);--> statement-breakpoint
CREATE INDEX `settlements_original_created_idx` ON `settlements` (`original_id`,`created_at`);