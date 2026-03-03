CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`operation` text DEFAULT 'original' NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`label` text NOT NULL,
	`memo` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`parent_id` text,
	`approved_by` text,
	`approved_at` integer,
	`approval_comment` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "entry_operation_parent" CHECK(("entry"."operation" = 'original' AND "entry"."parent_id" IS NULL) OR ("entry"."operation" != 'original' AND "entry"."parent_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `entry_user_status_idx` ON `entry` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `entry_user_date_idx` ON `entry` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `entry_parent_id_idx` ON `entry` (`parent_id`);--> statement-breakpoint
CREATE TABLE `entry_image` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`storage_path` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_image_entry_id_idx` ON `entry_image` (`entry_id`);--> statement-breakpoint
CREATE TABLE `partner_invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_id` text NOT NULL,
	`invitee_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `partner_invitation_inviter_id_idx` ON `partner_invitation` (`inviter_id`);--> statement-breakpoint
CREATE INDEX `partner_invitation_invitee_email_idx` ON `partner_invitation` (`invitee_email`);--> statement-breakpoint
CREATE TABLE `partnership` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_id` text NOT NULL,
	`invitee_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invitee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "partnership_no_self" CHECK("partnership"."inviter_id" != "partnership"."invitee_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partnership_inviter_id_unique` ON `partnership` (`inviter_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `partnership_invitee_id_unique` ON `partnership` (`invitee_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `settlement` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`operation` text DEFAULT 'original' NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`parent_id` text,
	`approved_by` text,
	`approved_at` integer,
	`approval_comment` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `settlement`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "settlement_operation_parent" CHECK(("settlement"."operation" = 'original' AND "settlement"."parent_id" IS NULL) OR ("settlement"."operation" != 'original' AND "settlement"."parent_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `settlement_user_status_idx` ON `settlement` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `settlement_parent_id_idx` ON `settlement` (`parent_id`);--> statement-breakpoint
CREATE TABLE `settlement_image` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	`storage_path` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`settlement_id`) REFERENCES `settlement`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlement_image_settlement_id_idx` ON `settlement_image` (`settlement_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`is_managed` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);