ALTER TABLE `entries` ADD `latest` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `entries_user_latest_idx` ON `entries` (`user_id`,`latest`);--> statement-breakpoint
ALTER TABLE `settlements` ADD `latest` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `settlements_user_latest_idx` ON `settlements` (`user_id`,`latest`);