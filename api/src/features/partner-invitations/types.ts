export type InvitationStatus = "pending" | "accepted" | "expired";

export type CreateInvitationInput = {
	inviteeEmail: string;
};
