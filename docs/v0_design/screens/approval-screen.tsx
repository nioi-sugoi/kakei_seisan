"use client"

import { HouseholdEntry } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Image as ImageIcon } from "lucide-react"
import { useState } from "react"

function formatAmount(amount: number) {
  return `\u00A5${amount.toLocaleString()}`
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`
}

interface ApprovalScreenProps {
  entry: HouseholdEntry
  onBack?: () => void
}

export function ApprovalScreen({ entry, onBack }: ApprovalScreenProps) {
  const [showRejectInput, setShowRejectInput] = useState(false)
  const typeLabels = { advance: "立替", deposit: "預り", settlement: "精算" }
  const typeColors = {
    advance: "bg-primary/10 text-primary border-primary/20",
    deposit: "bg-orange-50 text-orange-600 border-orange-200",
    settlement: "bg-emerald-50 text-emerald-600 border-emerald-200",
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"承認操作"}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        {/* Entry Detail */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col gap-4 px-5 py-5">
            <Badge
              variant="outline"
              className={`w-fit rounded-md text-xs font-medium ${typeColors[entry.type]}`}
            >
              {typeLabels[entry.type]}
            </Badge>

            <div className="text-center">
              <span
                className={`text-3xl font-bold tabular-nums ${
                  entry.type === "deposit" ? "text-orange-600" : "text-foreground"
                }`}
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

        {/* Reject Comment */}
        {showRejectInput && (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col gap-3 px-5 py-4">
              <span className="text-sm font-medium text-foreground">
                {"差し戻し理由"}
              </span>
              <Textarea
                placeholder="理由を入力してください..."
                className="min-h-20 rounded-xl bg-secondary text-base"
              />
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex flex-col gap-3 pb-4 pt-4">
          {!showRejectInput && (
            <Button className="h-12 rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600">
              {"承認する"}
            </Button>
          )}
          {showRejectInput ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl text-base"
                onClick={() => setShowRejectInput(false)}
              >
                {"キャンセル"}
              </Button>
              <Button className="flex-1 h-12 rounded-xl bg-destructive text-base font-semibold text-destructive-foreground hover:bg-destructive/90">
                {"差し戻す"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="h-12 rounded-xl border-destructive text-base font-medium text-destructive hover:bg-destructive/5"
              onClick={() => setShowRejectInput(true)}
            >
              {"差し戻す"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
