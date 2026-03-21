DROP INDEX `entries_user_latest_idx`;--> statement-breakpoint
CREATE INDEX `entries_original_created_idx` ON `entries` (`original_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `entries` DROP COLUMN `latest`;--> statement-breakpoint
DROP INDEX `settlements_user_latest_idx`;--> statement-breakpoint
CREATE INDEX `settlements_original_created_idx` ON `settlements` (`original_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `settlements` DROP COLUMN `latest`;