"use client"

import { HouseholdEntry } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { ImageThumbnailGroup } from "./image-thumbnail"

function formatAmount(amount: number) {
  return `\u00A5${amount.toLocaleString()}`
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`
}

interface SettlementDetailProps {
  entry: HouseholdEntry
  managed?: boolean
  onBack?: () => void
  onImageTap?: (index: number) => void
}

/**
 * 精算詳細画面
 *
 * 精算完了後に精算内容と証跡画像を確認する画面。
 * 記録詳細画面と同様の構造だが、精算特有の表示（カテゴリ、精算額）がある。
 * 管理モードの承認者が証跡画像を確認するユースケースで重要。
 */
export function SettlementDetailScreen({
  entry,
  managed = false,
  onBack,
  onImageTap,
}: SettlementDetailProps) {
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
        <h1 className="text-lg font-bold text-foreground">{"精算詳細"}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        {/* Main Info Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col gap-4 px-5 py-5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 border-emerald-200"
              >
                {"精算"}
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
                className={`text-3xl font-bold tabular-nums text-emerald-600 ${
                  entry.status === "cancelled" ? "line-through opacity-50" : ""
                }`}
              >
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
            </div>
          </CardContent>
        </Card>

        {/* Evidence Images */}
        {entry.images && entry.images.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="px-5 py-4">
              <ImageThumbnailGroup
                images={entry.images}
                label="証跡画像"
                onImageTap={(_, index) => onImageTap?.(index)}
              />
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
                  <span className="text-xs text-muted-foreground">{"2026年3月8日"}</span>
                  <span className="text-sm font-medium text-foreground">{"精算"}</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-emerald-600">{"\u00A55,000"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Entry Link */}
        {entry.relatedEntryId && (
          <button className="flex items-center justify-center gap-2 text-sm text-primary">
            {"元の精算を見る"}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Action Buttons */}
        {entry.status === "active" && (
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
      </div>
    </div>
  )
}
