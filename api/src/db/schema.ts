import { relations, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import {
	check,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

// ============================================================
// Better Auth 管理テーブル
// ============================================================

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.default(false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = sqliteTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp_ms",
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp_ms",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================================
// アプリケーションテーブル
// ============================================================

export const partnerships = sqliteTable(
	"partnerships",
	{
		id: text("id").primaryKey(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id)
			.unique(),
		inviteeId: text("invitee_id")
			.notNull()
			.references(() => user.id)
			.unique(),
		inviterIsManaged: integer("inviter_is_managed", { mode: "boolean" })
			.notNull()
			.default(false),
		inviteeIsManaged: integer("invitee_is_managed", { mode: "boolean" })
			.notNull()
			.default(false),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		check(
			"partnerships_not_self",
			sql`${table.inviterId} != ${table.inviteeId}`,
		),
	],
);

export const partnerInvitations = sqliteTable(
	"partner_invitations",
	{
		id: text("id").primaryKey(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id),
		inviteeEmail: text("invitee_email").notNull(),
		status: text("status").notNull().default("pending"),
		expiresAt: integer("expires_at").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		check(
			"partner_invitations_status_check",
			sql`${table.status} IN ('pending', 'accepted', 'expired')`,
		),
	],
);

export const entries = sqliteTable(
	"entries",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		category: text("category", { enum: ["advance", "deposit"] }).notNull(),
		operation: text("operation", {
			enum: ["original", "modification", "cancellation"],
		})
			.notNull()
			.default("original"),
		amount: integer("amount").notNull(),
		date: text("date").notNull(),
		label: text("label").notNull(),
		memo: text("memo"),
		status: text("status", { enum: ["approved", "pending", "rejected"] })
			.notNull()
			.default("approved"),
		parentId: text("parent_id").references((): AnySQLiteColumn => entries.id),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at"),
		approvalComment: text("approval_comment"),
		createdAt: integer("created_at")
			.notNull()
			.$defaultFn(() => Date.now()),
		updatedAt: integer("updated_at")
			.notNull()
			.$defaultFn(() => Date.now()),
	},
	(table) => [
		index("entries_user_status_idx").on(table.userId, table.status),
		index("entries_user_date_idx").on(table.userId, table.date),
		index("entries_user_created_idx").on(table.userId, table.createdAt),
		index("entries_parent_idx").on(table.parentId),
		check(
			"entries_category_check",
			sql`${table.category} IN ('advance', 'deposit')`,
		),
		check(
			"entries_operation_check",
			sql`${table.operation} IN ('original', 'modification', 'cancellation')`,
		),
		check(
			"entries_status_check",
			sql`${table.status} IN ('approved', 'pending', 'rejected')`,
		),
		check(
			"entries_parent_check",
			sql`(${table.operation} = 'original' AND ${table.parentId} IS NULL) OR (${table.operation} != 'original' AND ${table.parentId} IS NOT NULL)`,
		),
		check(
			"entries_amount_check",
			sql`${table.operation} = 'original' AND ${table.amount} >= 0 OR ${table.operation} != 'original'`,
		),
	],
);

export const settlements = sqliteTable(
	"settlements",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		operation: text("operation", {
			enum: ["original", "modification", "cancellation"],
		})
			.notNull()
			.default("original"),
		amount: integer("amount").notNull(),
		date: text("date").notNull(),
		status: text("status", { enum: ["approved", "pending", "rejected"] })
			.notNull()
			.default("approved"),
		parentId: text("parent_id").references(
			(): AnySQLiteColumn => settlements.id,
		),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at"),
		approvalComment: text("approval_comment"),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [
		index("settlements_user_status_idx").on(table.userId, table.status),
		index("settlements_user_date_idx").on(table.userId, table.date),
		index("settlements_parent_idx").on(table.parentId),
		check(
			"settlements_operation_check",
			sql`${table.operation} IN ('original', 'modification', 'cancellation')`,
		),
		check(
			"settlements_status_check",
			sql`${table.status} IN ('approved', 'pending', 'rejected')`,
		),
		check(
			"settlements_parent_check",
			sql`(${table.operation} = 'original' AND ${table.parentId} IS NULL) OR (${table.operation} != 'original' AND ${table.parentId} IS NOT NULL)`,
		),
		check(
			"settlements_amount_check",
			sql`${table.operation} = 'original' AND ${table.amount} >= 0 OR ${table.operation} != 'original'`,
		),
	],
);

export const entryImages = sqliteTable(
	"entry_images",
	{
		id: text("id").primaryKey(),
		entryId: text("entry_id")
			.notNull()
			.references(() => entries.id),
		storagePath: text("storage_path").notNull(),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [index("entry_images_entry_idx").on(table.entryId)],
);

export const settlementImages = sqliteTable(
	"settlement_images",
	{
		id: text("id").primaryKey(),
		settlementId: text("settlement_id")
			.notNull()
			.references(() => settlements.id),
		storagePath: text("storage_path").notNull(),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [index("settlement_images_settlement_idx").on(table.settlementId)],
);

// ============================================================
// リレーション定義
// ============================================================

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	invitedPartnerships: many(partnerships, { relationName: "inviter" }),
	acceptedPartnerships: many(partnerships, { relationName: "invitee" }),
	partnerInvitations: many(partnerInvitations),
	entries: many(entries, { relationName: "entryUser" }),
	settlements: many(settlements, { relationName: "settlementUser" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const partnershipsRelations = relations(partnerships, ({ one }) => ({
	inviter: one(user, {
		fields: [partnerships.inviterId],
		references: [user.id],
		relationName: "inviter",
	}),
	invitee: one(user, {
		fields: [partnerships.inviteeId],
		references: [user.id],
		relationName: "invitee",
	}),
}));

export const partnerInvitationsRelations = relations(
	partnerInvitations,
	({ one }) => ({
		inviter: one(user, {
			fields: [partnerInvitations.inviterId],
			references: [user.id],
		}),
	}),
);

export const entriesRelations = relations(entries, ({ one, many }) => ({
	user: one(user, {
		fields: [entries.userId],
		references: [user.id],
		relationName: "entryUser",
	}),
	parent: one(entries, {
		fields: [entries.parentId],
		references: [entries.id],
		relationName: "entryChildren",
	}),
	children: many(entries, { relationName: "entryChildren" }),
	approver: one(user, {
		fields: [entries.approvedBy],
		references: [user.id],
		relationName: "entryApprover",
	}),
	images: many(entryImages),
}));

export const settlementsRelations = relations(settlements, ({ one, many }) => ({
	user: one(user, {
		fields: [settlements.userId],
		references: [user.id],
		relationName: "settlementUser",
	}),
	parent: one(settlements, {
		fields: [settlements.parentId],
		references: [settlements.id],
		relationName: "settlementChildren",
	}),
	children: many(settlements, { relationName: "settlementChildren" }),
	approver: one(user, {
		fields: [settlements.approvedBy],
		references: [user.id],
		relationName: "settlementApprover",
	}),
	images: many(settlementImages),
}));

export const entryImagesRelations = relations(entryImages, ({ one }) => ({
	entry: one(entries, {
		fields: [entryImages.entryId],
		references: [entries.id],
	}),
}));

export const settlementImagesRelations = relations(
	settlementImages,
	({ one }) => ({
		settlement: one(settlements, {
			fields: [settlementImages.settlementId],
			references: [settlements.id],
		}),
	}),
);
