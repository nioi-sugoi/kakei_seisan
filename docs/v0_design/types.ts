export type EntryType = "advance" | "deposit" | "settlement"
export type ApprovalStatus = "pending" | "approved" | "rejected"
export type EntryStatus = "active" | "modified" | "cancelled"

/** サムネイル画像の状態を表す型 */
export type ImageLoadState = "loading" | "loaded" | "error"

/** 表示用の画像情報 */
export interface DisplayImage {
  id: string
  /** サムネイルURL（実装時はR2 presigned URL等） */
  thumbnailUrl: string
  /** フルサイズURL */
  fullUrl: string
  /** 読み込み状態 */
  loadState: ImageLoadState
}

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
  /** 表示用の画像一覧（記録=レシート画像、精算=証跡画像） */
  images?: DisplayImage[]
  status: EntryStatus
  approvalStatus?: ApprovalStatus
  rejectionComment?: string
  relatedEntryId?: string
  owner: "self" | "partner"
}
