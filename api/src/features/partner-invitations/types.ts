import type { partnerInvitations } from "../../db/schema";

export type PartnerInvitation = typeof partnerInvitations.$inferSelect;
export type InvitationStatus = PartnerInvitation["status"];
