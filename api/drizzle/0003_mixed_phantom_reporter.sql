PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_partner_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_id` text NOT NULL,
	`invitee_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "partner_invitations_status_check" CHECK("__new_partner_invitations"."status" IN ('pending', 'accepted', 'expired', 'cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_partner_invitations`("id", "inviter_id", "invitee_email", "status", "expires_at", "created_at") SELECT "id", "inviter_id", "invitee_email", "status", "expires_at", "created_at" FROM `partner_invitations`;--> statement-breakpoint
DROP TABLE `partner_invitations`;--> statement-breakpoint
ALTER TABLE `__new_partner_invitations` RENAME TO `partner_invitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;