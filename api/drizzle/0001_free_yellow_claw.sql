CREATE TABLE `entries` (
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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "entries_category_check" CHECK("entries"."category" IN ('advance', 'deposit')),
	CONSTRAINT "entries_operation_check" CHECK("entries"."operation" IN ('original', 'modification', 'cancellation')),
	CONSTRAINT "entries_status_check" CHECK("entries"."status" IN ('approved', 'pending', 'rejected')),
	CONSTRAINT "entries_parent_check" CHECK(("entries"."operation" = 'original' AND "entries"."parent_id" IS NULL) OR ("entries"."operation" != 'original' AND "entries"."parent_id" IS NOT NULL)),
	CONSTRAINT "entries_amount_check" CHECK("entries"."operation" = 'original' AND "entries"."amount" >= 0 OR "entries"."operation" != 'original')
);
--> statement-breakpoint
CREATE INDEX `entries_user_status_idx` ON `entries` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `entries_user_date_idx` ON `entries` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `entries_parent_idx` ON `entries` (`parent_id`);--> statement-breakpoint
CREATE TABLE `entry_images` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`storage_path` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_images_entry_idx` ON `entry_images` (`entry_id`);--> statement-breakpoint
CREATE TABLE `partner_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_id` text NOT NULL,
	`invitee_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "partner_invitations_status_check" CHECK("partner_invitations"."status" IN ('pending', 'accepted', 'expired'))
);
--> statement-breakpoint
CREATE TABLE `partnerships` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_id` text NOT NULL,
	`invitee_id` text NOT NULL,
	`inviter_is_managed` integer DEFAULT false NOT NULL,
	`invitee_is_managed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invitee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "partnerships_not_self" CHECK("partnerships"."inviter_id" != "partnerships"."invitee_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partnerships_inviter_id_unique` ON `partnerships` (`inviter_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `partnerships_invitee_id_unique` ON `partnerships` (`invitee_id`);--> statement-breakpoint
CREATE TABLE `settlement_images` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	`storage_path` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`settlement_id`) REFERENCES `settlements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlement_images_settlement_idx` ON `settlement_images` (`settlement_id`);--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`operation` text DEFAULT 'original' NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`parent_id` text,
	`approved_by` text,
	`approved_at` integer,
	`approval_comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `settlements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "settlements_operation_check" CHECK("settlements"."operation" IN ('original', 'modification', 'cancellation')),
	CONSTRAINT "settlements_status_check" CHECK("settlements"."status" IN ('approved', 'pending', 'rejected')),
	CONSTRAINT "settlements_parent_check" CHECK(("settlements"."operation" = 'original' AND "settlements"."parent_id" IS NULL) OR ("settlements"."operation" != 'original' AND "settlements"."parent_id" IS NOT NULL)),
	CONSTRAINT "settlements_amount_check" CHECK("settlements"."operation" = 'original' AND "settlements"."amount" >= 0 OR "settlements"."operation" != 'original')
);
--> statement-breakpoint
CREATE INDEX `settlements_user_status_idx` ON `settlements` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `settlements_user_date_idx` ON `settlements` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `settlements_parent_idx` ON `settlements` (`parent_id`);