"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"

interface EnterCodeScreenProps {
  onBack?: () => void
}

export function EnterCodeScreen({ onBack }: EnterCodeScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"招待コード入力"}</h1>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {"パートナーから受け取ったコードを入力してください"}
        </p>

        <div className="flex w-full gap-2 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <Input
              key={i}
              type="text"
              maxLength={1}
              className="h-14 w-11 rounded-lg bg-card text-center text-xl font-bold uppercase"
            />
          ))}
        </div>

        <Button className="mt-4 h-12 w-full rounded-xl text-base font-semibold">
          {"連携する"}
        </Button>
      </div>
    </div>
  )
}
