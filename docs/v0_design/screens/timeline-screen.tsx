"use client"

import { useState } from "react"
import { BalanceSummary } from "./balance-summary"
import { EntryCard } from "./entry-card"
import { HouseholdEntry } from "@/lib/types"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type Filter = "all" | "advance" | "deposit" | "settlement"

interface TimelineScreenProps {
  records: HouseholdEntry[]
  balance: number
  managed?: boolean
  onSettle?: () => void
  onAdd?: () => void
  onEntryTap?: (record: HouseholdEntry) => void
}

function groupByMonth(records: HouseholdEntry[]) {
  const groups: Record<string, HouseholdEntry[]> = {}
  records.forEach((r) => {
    const d = new Date(r.occurredOn)
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
  const [filter, setFilter] = useState<Filter>("all")

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "advance", label: "立替" },
    { value: "deposit", label: "預り" },
    { value: "settlement", label: "精算" },
  ]

  const filtered = filter === "all" ? records : records.filter((r) => r.type === filter)
  const grouped = groupByMonth(filtered)

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Balance */}
      <div className="px-4 pt-4">
        <BalanceSummary balance={balance} onSettle={onSettle} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto px-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
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
                  record={r}
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
