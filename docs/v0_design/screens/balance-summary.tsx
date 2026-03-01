"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface BalanceSummaryProps {
  balance: number
  onSettle?: () => void
}

export function BalanceSummary({ balance, onSettle }: BalanceSummaryProps) {
  const isPositive = balance >= 0
  return (
    <Card className="border-0 bg-primary shadow-lg">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-5">
        <span className="text-sm font-medium text-primary-foreground/80">
          {"現在の残高"}
        </span>
        <span className="text-3xl font-bold tabular-nums text-primary-foreground">
          {`\u00A5${Math.abs(balance).toLocaleString()}`}
        </span>
        <span className="text-xs font-medium text-primary-foreground/70">
          {isPositive ? "家計から受け取り" : "家計へ入金"}
        </span>
        {onSettle && (
          <Button
            onClick={onSettle}
            className="mt-1 h-10 rounded-xl bg-primary-foreground px-8 font-semibold text-primary hover:bg-primary-foreground/90"
          >
            {"精算する"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
