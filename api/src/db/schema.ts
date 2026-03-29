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
			sql`${table.status} IN ('pending', 'accepted', 'expired', 'cancelled')`,
		),
	],
);

export const entryVersions = sqliteTable(
	"entry_versions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		category: text("category", { enum: ["advance", "deposit"] }).notNull(),
		amount: integer("amount").notNull(),
		occurredOn: text("occurred_on").notNull(),
		label: text("label").notNull(),
		memo: text("memo"),
		originalId: text("original_id")
			.notNull()
			.references((): AnySQLiteColumn => entryVersions.id),
		cancelled: integer("cancelled", { mode: "boolean" })
			.notNull()
			.default(false),
		latest: integer("latest", { mode: "boolean" }).notNull().default(true),
		status: text("status", { enum: ["approved", "pending", "rejected"] })
			.notNull()
			.default("approved"),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at"),
		approvalComment: text("approval_comment"),
		createdAt: integer("created_at")
			.notNull()
			.$defaultFn(() => Date.now()),
	},
	(table) => [
		index("entry_versions_user_status_idx").on(table.userId, table.status),
		index("entry_versions_user_occurred_on_idx").on(
			table.userId,
			table.occurredOn,
		),
		index("entry_versions_user_created_idx").on(table.userId, table.createdAt),
		index("entry_versions_original_idx").on(table.originalId),
		index("entry_versions_original_created_idx").on(
			table.originalId,
			table.createdAt,
		),
		index("entry_versions_user_latest_idx").on(table.userId, table.latest),
		check(
			"entry_versions_category_check",
			sql`${table.category} IN ('advance', 'deposit')`,
		),
		check(
			"entry_versions_status_check",
			sql`${table.status} IN ('approved', 'pending', 'rejected')`,
		),
		check("entry_versions_amount_check", sql`${table.amount} >= 0`),
	],
);

export const settlementVersions = sqliteTable(
	"settlement_versions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		category: text("category", {
			enum: ["fromUser", "fromHousehold"],
		}).notNull(),
		amount: integer("amount").notNull(),
		occurredOn: text("occurred_on").notNull(),
		originalId: text("original_id")
			.notNull()
			.references((): AnySQLiteColumn => settlementVersions.id),
		cancelled: integer("cancelled", { mode: "boolean" })
			.notNull()
			.default(false),
		latest: integer("latest", { mode: "boolean" }).notNull().default(true),
		status: text("status", { enum: ["approved", "pending", "rejected"] })
			.notNull()
			.default("approved"),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at"),
		approvalComment: text("approval_comment"),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		index("settlement_versions_user_status_idx").on(table.userId, table.status),
		index("settlement_versions_user_occurred_on_idx").on(
			table.userId,
			table.occurredOn,
		),
		index("settlement_versions_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
		index("settlement_versions_original_idx").on(table.originalId),
		index("settlement_versions_user_latest_idx").on(table.userId, table.latest),
		index("settlement_versions_original_created_idx").on(
			table.originalId,
			table.createdAt,
		),
		check(
			"settlement_versions_category_check",
			sql`${table.category} IN ('fromUser', 'fromHousehold')`,
		),
		check(
			"settlement_versions_status_check",
			sql`${table.status} IN ('approved', 'pending', 'rejected')`,
		),
		check("settlement_versions_amount_check", sql`${table.amount} >= 0`),
	],
);

export const entryImageVersions = sqliteTable(
	"entry_image_versions",
	{
		id: text("id").primaryKey(),
		entryVersionId: text("entry_version_id")
			.notNull()
			.references(() => entryVersions.id),
		storagePath: text("storage_path").notNull(),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [index("entry_image_versions_entry_idx").on(table.entryVersionId)],
);

export const settlementImageVersions = sqliteTable(
	"settlement_image_versions",
	{
		id: text("id").primaryKey(),
		settlementVersionId: text("settlement_version_id")
			.notNull()
			.references(() => settlementVersions.id),
		storagePath: text("storage_path").notNull(),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		index("settlement_image_versions_settlement_idx").on(
			table.settlementVersionId,
		),
	],
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
	entries: many(entryVersions, { relationName: "entryUser" }),
	settlements: many(settlementVersions, { relationName: "settlementUser" }),
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

export const entryVersionsRelations = relations(
	entryVersions,
	({ one, many }) => ({
		user: one(user, {
			fields: [entryVersions.userId],
			references: [user.id],
			relationName: "entryUser",
		}),
		original: one(entryVersions, {
			fields: [entryVersions.originalId],
			references: [entryVersions.id],
			relationName: "entryVersions",
		}),
		versions: many(entryVersions, { relationName: "entryVersions" }),
		approver: one(user, {
			fields: [entryVersions.approvedBy],
			references: [user.id],
			relationName: "entryApprover",
		}),
		images: many(entryImageVersions),
	}),
);

export const settlementVersionsRelations = relations(
	settlementVersions,
	({ one, many }) => ({
		user: one(user, {
			fields: [settlementVersions.userId],
			references: [user.id],
			relationName: "settlementUser",
		}),
		original: one(settlementVersions, {
			fields: [settlementVersions.originalId],
			references: [settlementVersions.id],
			relationName: "settlementVersions",
		}),
		versions: many(settlementVersions, { relationName: "settlementVersions" }),
		approver: one(user, {
			fields: [settlementVersions.approvedBy],
			references: [user.id],
			relationName: "settlementApprover",
		}),
		images: many(settlementImageVersions),
	}),
);

export const entryImageVersionsRelations = relations(
	entryImageVersions,
	({ one }) => ({
		entry: one(entryVersions, {
			fields: [entryImageVersions.entryVersionId],
			references: [entryVersions.id],
		}),
	}),
);

export const settlementImageVersionsRelations = relations(
	settlementImageVersions,
	({ one }) => ({
		settlement: one(settlementVersions, {
			fields: [settlementImageVersions.settlementVersionId],
			references: [settlementVersions.id],
		}),
	}),
);
