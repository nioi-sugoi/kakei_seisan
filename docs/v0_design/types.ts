export type EntryType = "advance" | "deposit" | "settlement"
export type ApprovalStatus = "pending" | "approved" | "rejected"
export type EntryStatus = "active" | "modified" | "cancelled"

export interface HouseholdEntry {
  id: string
  type: EntryType
  amount: number
  occurredOn: string
  createdAt: string
  label: string
  memo?: string
  hasReceipt: boolean
  receiptCount?: number
  status: EntryStatus
  approvalStatus?: ApprovalStatus
  rejectionComment?: string
  relatedEntryId?: string
  owner: "self" | "partner"
}
