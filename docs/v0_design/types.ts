export type RecordType = "advance" | "deposit" | "settlement"
export type ApprovalStatus = "pending" | "approved" | "rejected"
export type RecordStatus = "active" | "modified" | "cancelled"

export interface HouseholdRecord {
  id: string
  type: RecordType
  amount: number
  date: string
  label: string
  memo?: string
  hasReceipt: boolean
  receiptCount?: number
  status: RecordStatus
  approvalStatus?: ApprovalStatus
  rejectionComment?: string
  relatedRecordId?: string
  owner: "self" | "partner"
}
