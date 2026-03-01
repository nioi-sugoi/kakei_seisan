"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Clock } from "lucide-react"
import { useState } from "react"

interface InviteCodeScreenProps {
  onBack?: () => void
}

export function InviteCodeScreen({ onBack }: InviteCodeScreenProps) {
  const [copied, setCopied] = useState(false)
  const code = "A3K9X2"

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"招待コード発行"}</h1>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {"このコードをパートナーに伝えてください"}
        </p>

        <Card className="w-full border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-8">
            <div className="flex items-center gap-3 text-4xl font-bold tracking-[0.3em] text-foreground">
              {code.split("").map((char, i) => (
                <span
                  key={i}
                  className="flex h-14 w-11 items-center justify-center rounded-lg bg-secondary text-2xl font-bold"
                >
                  {char}
                </span>
              ))}
            </div>

            <Button
              variant="outline"
              className="h-11 rounded-xl gap-2 px-6"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
              {copied ? "コピーしました" : "コードをコピー"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{"24時間有効"}</span>
        </div>
      </div>
    </div>
  )
}
