"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function OtpScreen() {
  const digits = ["1", "2", "3", "4", "5", ""]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"認証コード入力"}</h1>
      </div>

      <div className="flex flex-1 flex-col items-center gap-8 px-6 pt-12">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {"以下のメールアドレスに認証コードを送信しました"}
          </p>
          <p className="text-base font-semibold text-foreground">
            {"tanaka@example.com"}
          </p>
        </div>

        {/* OTP Input */}
        <div className="flex gap-3">
          {digits.map((d, i) => (
            <div
              key={i}
              className={`flex h-14 w-11 items-center justify-center rounded-xl border-2 text-2xl font-bold tabular-nums ${
                d
                  ? "border-primary bg-card text-foreground"
                  : "border-input bg-card text-muted-foreground"
              }`}
            >
              {d || "\u00A0"}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {"有効期限: 5分"}
        </p>

        {/* Actions */}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button variant="outline" className="h-11 rounded-xl text-sm font-medium">
            {"コードを再送信"}
          </Button>
          <Button variant="ghost" className="h-11 text-sm font-medium text-muted-foreground">
            {"メールアドレスを変更する"}
          </Button>
        </div>
      </div>
    </div>
  )
}
