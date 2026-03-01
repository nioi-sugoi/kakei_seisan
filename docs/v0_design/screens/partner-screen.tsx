"use client"

import { useState } from "react"
import { BalanceSummary } from "./balance-summary"
import { RecordCard } from "./record-card"
import { HouseholdRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"

type Filter = "all" | "advance" | "deposit" | "settlement" | "pending" | "rejected"

interface PartnerScreenProps {
  records: HouseholdRecord[]
  balance: number
  partnerName: string
  managed?: boolean
  onRecordTap?: (record: HouseholdRecord) => void
}

export function PartnerScreen({
  records,
  balance,
  partnerName,
  managed = false,
  onRecordTap,
}: PartnerScreenProps) {
  const [filter, setFilter] = useState<Filter>("all")

  const baseFilters: { value: Filter; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "advance", label: "立替" },
    { value: "deposit", label: "預り" },
    { value: "settlement", label: "精算" },
  ]

  const managedFilters: { value: Filter; label: string }[] = managed
    ? [
        { value: "pending", label: "承認待ち" },
        { value: "rejected", label: "差し戻し" },
      ]
    : []

  const filters = [...baseFilters, ...managedFilters]

  const filtered = (() => {
    switch (filter) {
      case "pending":
        return records.filter((r) => r.approvalStatus === "pending")
      case "rejected":
        return records.filter((r) => r.approvalStatus === "rejected")
      case "all":
        return records
      default:
        return records.filter((r) => r.type === filter)
    }
  })()

  const pendingCount = records.filter((r) => r.approvalStatus === "pending").length

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="px-4 pt-4">
        <h2 className="mb-3 text-lg font-bold text-foreground">
          {`${partnerName}\u3055\u3093\u306E\u8A18\u9332`}
        </h2>
        <BalanceSummary balance={balance} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto px-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
            {f.value === "pending" && pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="flex flex-col gap-2 px-4">
        {filtered.map((r) => (
          <div key={r.id} className="flex flex-col gap-2">
            <RecordCard
              record={r}
              showApproval={managed}
              onTap={onRecordTap}
            />
            {managed && r.approvalStatus === "pending" && (
              <div className="flex gap-2 px-2">
                <Button
                  size="sm"
                  className="flex-1 h-9 rounded-lg bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  {"承認"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 rounded-lg border-destructive text-sm font-medium text-destructive hover:bg-destructive/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {"差し戻し"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
