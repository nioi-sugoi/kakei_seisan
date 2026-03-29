-- テーブルリネーム: バージョン管理テーブルに _versions サフィックスを付与
--> statement-breakpoint
ALTER TABLE `entries` RENAME TO `entry_versions`;
--> statement-breakpoint
ALTER TABLE `settlements` RENAME TO `settlement_versions`;
--> statement-breakpoint
ALTER TABLE `entry_images` RENAME TO `entry_image_versions`;
--> statement-breakpoint
ALTER TABLE `settlement_images` RENAME TO `settlement_image_versions`;
--> statement-breakpoint
ALTER TABLE `entry_image_versions` RENAME COLUMN `entry_id` TO `entry_version_id`;
--> statement-breakpoint
ALTER TABLE `settlement_image_versions` RENAME COLUMN `settlement_id` TO `settlement_version_id`;
--> statement-breakpoint
DROP INDEX `entries_user_status_idx`;
--> statement-breakpoint
DROP INDEX `entries_user_occurred_on_idx`;
--> statement-breakpoint
DROP INDEX `entries_user_created_idx`;
--> statement-breakpoint
DROP INDEX `entries_original_idx`;
--> statement-breakpoint
DROP INDEX `entries_original_created_idx`;
--> statement-breakpoint
DROP INDEX `entries_user_latest_idx`;
--> statement-breakpoint
CREATE INDEX `entry_versions_user_status_idx` ON `entry_versions` (`user_id`, `status`);
--> statement-breakpoint
CREATE INDEX `entry_versions_user_occurred_on_idx` ON `entry_versions` (`user_id`, `occurred_on`);
--> statement-breakpoint
CREATE INDEX `entry_versions_user_created_idx` ON `entry_versions` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `entry_versions_original_idx` ON `entry_versions` (`original_id`);
--> statement-breakpoint
CREATE INDEX `entry_versions_original_created_idx` ON `entry_versions` (`original_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `entry_versions_user_latest_idx` ON `entry_versions` (`user_id`, `latest`);
--> statement-breakpoint
DROP INDEX `settlements_user_status_idx`;
--> statement-breakpoint
DROP INDEX `settlements_user_occurred_on_idx`;
--> statement-breakpoint
DROP INDEX `settlements_user_created_idx`;
--> statement-breakpoint
DROP INDEX `settlements_original_idx`;
--> statement-breakpoint
DROP INDEX `settlements_user_latest_idx`;
--> statement-breakpoint
DROP INDEX `settlements_original_created_idx`;
--> statement-breakpoint
CREATE INDEX `settlement_versions_user_status_idx` ON `settlement_versions` (`user_id`, `status`);
--> statement-breakpoint
CREATE INDEX `settlement_versions_user_occurred_on_idx` ON `settlement_versions` (`user_id`, `occurred_on`);
--> statement-breakpoint
CREATE INDEX `settlement_versions_user_created_idx` ON `settlement_versions` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `settlement_versions_original_idx` ON `settlement_versions` (`original_id`);
--> statement-breakpoint
CREATE INDEX `settlement_versions_user_latest_idx` ON `settlement_versions` (`user_id`, `latest`);
--> statement-breakpoint
CREATE INDEX `settlement_versions_original_created_idx` ON `settlement_versions` (`original_id`, `created_at`);
--> statement-breakpoint
DROP INDEX `entry_images_entry_idx`;
--> statement-breakpoint
CREATE INDEX `entry_image_versions_entry_idx` ON `entry_image_versions` (`entry_version_id`);
--> statement-breakpoint
DROP INDEX `settlement_images_settlement_idx`;
--> statement-breakpoint
CREATE INDEX `settlement_image_versions_settlement_idx` ON `settlement_image_versions` (`settlement_version_id`);
