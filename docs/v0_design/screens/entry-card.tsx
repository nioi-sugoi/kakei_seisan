"use client"

import { HouseholdEntry } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Image as ImageIcon, Pencil, MessageCircle } from "lucide-react"

function formatAmount(amount: number) {
  return `\u00A5${amount.toLocaleString()}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function TypeBadge({ type }: { type: HouseholdEntry["type"] }) {
  const config = {
    advance: { label: "立替", className: "bg-primary/10 text-primary border-primary/20" },
    deposit: { label: "預り", className: "bg-orange-50 text-orange-600 border-orange-200" },
    settlement: { label: "精算", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  }
  const c = config[type]
  return (
    <Badge variant="outline" className={`rounded-md text-xs font-medium ${c.className}`}>
      {c.label}
    </Badge>
  )
}

function ApprovalBadge({ status }: { status?: HouseholdEntry["approvalStatus"] }) {
  if (!status) return null
  const config = {
    pending: { label: "承認待ち", className: "bg-amber-50 text-amber-600 border-amber-200" },
    approved: { label: "承認済み", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    rejected: { label: "差し戻し", className: "bg-red-50 text-red-500 border-red-200" },
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={`rounded-md text-xs ${c.className}`}>
      {c.label}
    </Badge>
  )
}

interface EntryCardProps {
  entry: HouseholdEntry
  showApproval?: boolean
  onTap?: (entry: HouseholdEntry) => void
}

export function EntryCard({ entry, showApproval = false, onTap }: EntryCardProps) {
  const isCancelled = entry.status === "cancelled"
  const isModifiedVersion = entry.status === "active" && !!entry.relatedEntryId

  return (
    <Card
      className={`cursor-pointer border-0 shadow-sm transition-shadow hover:shadow-md ${isCancelled ? "opacity-50" : ""}`}
      onClick={() => onTap?.(entry)}
    >
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <TypeBadge type={entry.type} />
            {showApproval && <ApprovalBadge status={entry.approvalStatus} />}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{entry.label}</span>
            {entry.hasReceipt && (
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(entry.occurredOn)}</span>
            {isModifiedVersion && (
              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-lg font-bold tabular-nums text-foreground ${isCancelled ? "line-through" : ""}`}
          >
            {formatAmount(entry.amount)}
          </span>
        </div>
      </CardContent>
      {entry.approvalStatus === "rejected" && entry.rejectionComment && showApproval && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs leading-relaxed text-red-600">{entry.rejectionComment}</p>
        </div>
      )}
    </Card>
  )
}
