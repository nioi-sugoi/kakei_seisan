"use client"

import { HouseholdEntry } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Image as ImageIcon,
  ArrowRight,
  MessageCircle,
} from "lucide-react"

function formatAmount(amount: number) {
  return `\u00A5${amount.toLocaleString()}`
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`
}

interface EntryDetailProps {
  entry: HouseholdEntry
  managed?: boolean
  onBack?: () => void
}

export function EntryDetailScreen({ entry, managed = false, onBack }: EntryDetailProps) {
  const typeLabels = { advance: "立替", deposit: "預り", settlement: "精算" }
  const typeColors = {
    advance: "bg-primary/10 text-primary border-primary/20",
    deposit: "bg-orange-50 text-orange-600 border-orange-200",
    settlement: "bg-emerald-50 text-emerald-600 border-emerald-200",
  }

  const approvalConfig = {
    pending: { label: "承認待ち", className: "bg-amber-50 text-amber-600 border-amber-200" },
    approved: { label: "承認済み", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    rejected: { label: "差し戻し", className: "bg-red-50 text-red-500 border-red-200" },
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"記録詳細"}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        {/* Main Info Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col gap-4 px-5 py-5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`rounded-md text-xs font-medium ${typeColors[entry.type]}`}
              >
                {typeLabels[entry.type]}
              </Badge>
              {entry.status === "modified" && (
                <Badge variant="outline" className="rounded-md text-xs bg-amber-50 text-amber-600 border-amber-200">
                  {"修正"}
                </Badge>
              )}
              {entry.status === "cancelled" && (
                <Badge variant="outline" className="rounded-md text-xs bg-red-50 text-red-500 border-red-200">
                  {"取消"}
                </Badge>
              )}
              {managed && entry.approvalStatus && (
                <Badge
                  variant="outline"
                  className={`rounded-md text-xs ${approvalConfig[entry.approvalStatus].className}`}
                >
                  {approvalConfig[entry.approvalStatus].label}
                </Badge>
              )}
            </div>

            <div className="text-center">
              <span
                className={`text-3xl font-bold tabular-nums ${
                  entry.status === "cancelled" ? "line-through opacity-50" : ""
                } ${entry.type === "deposit" ? "text-orange-600" : entry.type === "settlement" ? "text-emerald-600" : "text-foreground"}`}
              >
                {entry.type === "deposit" ? "-" : ""}
                {formatAmount(entry.amount)}
              </span>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{"日付"}</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDateFull(entry.occurredOn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{"ラベル"}</span>
                <span className="text-sm font-medium text-foreground">{entry.label}</span>
              </div>
              {entry.memo && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{"メモ"}</span>
                  <span className="text-sm text-foreground">{entry.memo}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipt Images */}
        {entry.hasReceipt && (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col gap-3 px-5 py-4">
              <span className="text-sm font-medium text-foreground">{"レシート画像"}</span>
              <div className="flex gap-3">
                {Array.from({ length: entry.receiptCount || 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-24 w-24 items-center justify-center rounded-lg bg-secondary"
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejection Comment */}
        {managed && entry.approvalStatus === "rejected" && entry.rejectionComment && (
          <Card className="border-0 border-l-4 border-l-red-400 shadow-sm">
            <CardContent className="flex items-start gap-3 px-4 py-4">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-red-500">{"差し戻しコメント"}</span>
                <p className="text-sm leading-relaxed text-foreground">{entry.rejectionComment}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operation History */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col gap-3 px-5 py-4">
            <span className="text-sm font-semibold text-foreground">{"操作履歴"}</span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{"2026年3月15日"}</span>
                  <span className="text-sm font-medium text-foreground">{"スーパー買い物"}</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground">{"\u00A54,280"}</span>
              </div>
              {entry.status !== "active" && (
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{"2026年3月16日"}</span>
                      <Badge variant="outline" className="rounded-md text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                        {entry.status === "cancelled" ? "取消" : "修正"}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium text-foreground">{entry.label}</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${entry.status === "cancelled" ? "line-through opacity-50" : "text-foreground"}`}>
                    {formatAmount(entry.amount)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Related Entry Link */}
        {entry.relatedEntryId && (
          <button className="flex items-center justify-center gap-2 text-sm text-primary">
            {entry.status === "modified"
              ? "修正後の記録を見る"
              : entry.status === "cancelled"
                ? "取消記録を見る"
                : "元の記録を見る"}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Action Buttons */}
        {entry.status === "active" && entry.type !== "settlement" && (
          <div className="mt-auto flex gap-3 pb-4 pt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-medium">
              {"修正する"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl border-destructive text-base font-medium text-destructive hover:bg-destructive/5"
            >
              {"取り消す"}
            </Button>
          </div>
        )}

        {/* Restore Button (for cancelled entries) */}
        {entry.status === "cancelled" && (
          <div className="mt-auto pb-4 pt-4">
            <Button className="w-full h-12 rounded-xl text-base font-semibold">
              {"復元する"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
