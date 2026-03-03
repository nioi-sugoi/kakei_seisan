import { relations, sql } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	check,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

// ============================================================================
// Better Auth コアテーブル (npx auth@latest generate で生成、is_managed を追加)
// ============================================================================

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
		.$onUpdate(() => new Date())
		.notNull(),
	isManaged: integer("is_managed", { mode: "boolean" }).default(false),
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
			.$onUpdate(() => new Date())
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
			.$onUpdate(() => new Date())
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
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================================================
// アプリ固有テーブル
// ============================================================================

export const partnership = sqliteTable(
	"partnership",
	{
		id: text("id").primaryKey(),
		inviterId: text("inviter_id")
			.notNull()
			.unique()
			.references(() => user.id),
		inviteeId: text("invitee_id")
			.notNull()
			.unique()
			.references(() => user.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		check("partnership_no_self", sql`${table.inviterId} != ${table.inviteeId}`),
	],
);

export const partnerInvitation = sqliteTable(
	"partner_invitation",
	{
		id: text("id").primaryKey(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id),
		inviteeEmail: text("invitee_email").notNull(),
		status: text("status").notNull().default("pending"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("partner_invitation_inviter_id_idx").on(table.inviterId),
		index("partner_invitation_invitee_email_idx").on(table.inviteeEmail),
	],
);

export const entry = sqliteTable(
	"entry",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		category: text("category").notNull(),
		operation: text("operation").notNull().default("original"),
		amount: integer("amount").notNull(),
		date: text("date").notNull(),
		label: text("label").notNull(),
		memo: text("memo"),
		status: text("status").notNull().default("approved"),
		parentId: text("parent_id").references((): AnySQLiteColumn => entry.id),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
		approvalComment: text("approval_comment"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("entry_user_status_idx").on(table.userId, table.status),
		index("entry_user_date_idx").on(table.userId, table.date),
		index("entry_parent_id_idx").on(table.parentId),
		check(
			"entry_operation_parent",
			sql`(${table.operation} = 'original' AND ${table.parentId} IS NULL) OR (${table.operation} != 'original' AND ${table.parentId} IS NOT NULL)`,
		),
	],
);

export const settlement = sqliteTable(
	"settlement",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		operation: text("operation").notNull().default("original"),
		amount: integer("amount").notNull(),
		status: text("status").notNull().default("approved"),
		parentId: text("parent_id").references(
			(): AnySQLiteColumn => settlement.id,
		),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
		approvalComment: text("approval_comment"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("settlement_user_status_idx").on(table.userId, table.status),
		index("settlement_parent_id_idx").on(table.parentId),
		check(
			"settlement_operation_parent",
			sql`(${table.operation} = 'original' AND ${table.parentId} IS NULL) OR (${table.operation} != 'original' AND ${table.parentId} IS NOT NULL)`,
		),
	],
);

export const entryImage = sqliteTable(
	"entry_image",
	{
		id: text("id").primaryKey(),
		entryId: text("entry_id")
			.notNull()
			.references(() => entry.id),
		storagePath: text("storage_path").notNull(),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("entry_image_entry_id_idx").on(table.entryId)],
);

export const settlementImage = sqliteTable(
	"settlement_image",
	{
		id: text("id").primaryKey(),
		settlementId: text("settlement_id")
			.notNull()
			.references(() => settlement.id),
		storagePath: text("storage_path").notNull(),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("settlement_image_settlement_id_idx").on(table.settlementId),
	],
);

// ============================================================================
// リレーション定義
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	entries: many(entry),
	settlements: many(settlement),
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

export const partnershipRelations = relations(partnership, ({ one }) => ({
	inviter: one(user, {
		fields: [partnership.inviterId],
		references: [user.id],
		relationName: "inviter",
	}),
	invitee: one(user, {
		fields: [partnership.inviteeId],
		references: [user.id],
		relationName: "invitee",
	}),
}));

export const partnerInvitationRelations = relations(
	partnerInvitation,
	({ one }) => ({
		inviter: one(user, {
			fields: [partnerInvitation.inviterId],
			references: [user.id],
		}),
	}),
);

export const entryRelations = relations(entry, ({ one, many }) => ({
	user: one(user, {
		fields: [entry.userId],
		references: [user.id],
	}),
	parent: one(entry, {
		fields: [entry.parentId],
		references: [entry.id],
		relationName: "entryModifications",
	}),
	approver: one(user, {
		fields: [entry.approvedBy],
		references: [user.id],
		relationName: "entryApprover",
	}),
	images: many(entryImage),
}));

export const settlementRelations = relations(settlement, ({ one, many }) => ({
	user: one(user, {
		fields: [settlement.userId],
		references: [user.id],
	}),
	parent: one(settlement, {
		fields: [settlement.parentId],
		references: [settlement.id],
		relationName: "settlementModifications",
	}),
	approver: one(user, {
		fields: [settlement.approvedBy],
		references: [user.id],
		relationName: "settlementApprover",
	}),
	images: many(settlementImage),
}));

export const entryImageRelations = relations(entryImage, ({ one }) => ({
	entry: one(entry, {
		fields: [entryImage.entryId],
		references: [entry.id],
	}),
}));

export const settlementImageRelations = relations(
	settlementImage,
	({ one }) => ({
		settlement: one(settlement, {
			fields: [settlementImage.settlementId],
			references: [settlement.id],
		}),
	}),
);
