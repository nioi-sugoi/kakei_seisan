"use client"

import { useState } from "react"
import { BalanceSummary } from "./balance-summary"
import { EntryCard } from "./entry-card"
import { HouseholdEntry, ApprovalStatus, EntryType } from "@/lib/types"
import { Plus, ArrowUpDown, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

type TypeFilter = "all" | EntryType
type StatusFilter = "all" | ApprovalStatus
type SortKey = "occurredOn" | "createdAt"
type SortOrder = "desc" | "asc"

interface TimelineScreenProps {
  records: HouseholdEntry[]
  balance: number
  managed?: boolean
  onSettle?: () => void
  onAdd?: () => void
  onEntryTap?: (record: HouseholdEntry) => void
}

const sortLabels: Record<SortKey, Record<SortOrder, string>> = {
  occurredOn: { desc: "発生日（新しい順）", asc: "発生日（古い順）" },
  createdAt: { desc: "記録日（新しい順）", asc: "記録日（古い順）" },
}

function groupByMonth(records: HouseholdEntry[], sortKey: SortKey) {
  const groups: Record<string, HouseholdEntry[]> = {}
  records.forEach((r) => {
    const dateStr = sortKey === "createdAt" ? r.createdAt : r.occurredOn
    const d = new Date(dateStr)
    const key = `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708`
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })
  return groups
}

export function TimelineScreen({
  records,
  balance,
  managed = false,
  onSettle,
  onAdd,
  onEntryTap,
}: TimelineScreenProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("occurredOn")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [showSortMenu, setShowSortMenu] = useState(false)

  const typeFilters: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "advance", label: "立替" },
    { value: "deposit", label: "預り" },
    { value: "settlement", label: "精算" },
  ]

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "approved", label: "承認済み" },
    { value: "pending", label: "承認待ち" },
    { value: "rejected", label: "差し戻し" },
  ]

  const sortOptions: { key: SortKey; order: SortOrder }[] = [
    { key: "occurredOn", order: "desc" },
    { key: "occurredOn", order: "asc" },
    { key: "createdAt", order: "desc" },
    { key: "createdAt", order: "asc" },
  ]

  // Filter: exclude superseded records, then apply type and status filters
  const latestOnly = records.filter((r) => r.status !== "modified")
  let filtered = latestOnly
  if (typeFilter !== "all") {
    filtered = filtered.filter((r) => r.type === typeFilter)
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((r) => r.approvalStatus === statusFilter)
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const aVal = sortKey === "createdAt" ? a.createdAt : a.occurredOn
    const bVal = sortKey === "createdAt" ? b.createdAt : b.occurredOn
    return sortOrder === "desc"
      ? bVal.localeCompare(aVal)
      : aVal.localeCompare(bVal)
  })

  const grouped = groupByMonth(sorted, sortKey)

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Balance */}
      <div className="px-4 pt-4">
        <BalanceSummary balance={balance} onSettle={onSettle} />
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col gap-1.5 px-4">
        {/* Type filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">{"種別"}</span>
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filter (managed mode only) */}
        {managed && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">{"ステータス"}</span>
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Sort control */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 py-0.5 text-xs font-medium text-primary"
          >
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            {sortLabels[sortKey][sortOrder]}
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          {showSortMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border bg-card shadow-lg">
              {sortOptions.map((opt) => (
                <button
                  key={`${opt.key}-${opt.order}`}
                  onClick={() => {
                    setSortKey(opt.key)
                    setSortOrder(opt.order)
                    setShowSortMenu(false)
                  }}
                  className={`block w-full whitespace-nowrap px-4 py-2 text-left text-xs ${
                    sortKey === opt.key && sortOrder === opt.order
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {sortLabels[opt.key][opt.order]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-4 px-4">
        {Object.entries(grouped).map(([month, recs]) => (
          <div key={month} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{month}</h3>
            <div className="flex flex-col gap-2">
              {recs.map((r) => (
                <EntryCard
                  key={r.id}
                  entry={r}
                  showApproval={managed}
                  onTap={onEntryTap}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      {onAdd && (
        <Button
          onClick={onAdd}
          className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">{"記録を追加"}</span>
        </Button>
      )}
    </div>
  )
}
