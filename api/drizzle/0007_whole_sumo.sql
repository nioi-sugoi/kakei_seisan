ALTER TABLE `entries` RENAME COLUMN "date" TO "occurred_on";--> statement-breakpoint
ALTER TABLE `settlements` RENAME COLUMN "date" TO "occurred_on";--> statement-breakpoint
DROP INDEX `entries_user_date_idx`;--> statement-breakpoint
CREATE INDEX `entries_user_occurred_on_idx` ON `entries` (`user_id`,`occurred_on`);--> statement-breakpoint
DROP INDEX `settlements_user_date_idx`;--> statement-breakpoint
CREATE INDEX `settlements_user_occurred_on_idx` ON `settlements` (`user_id`,`occurred_on`);