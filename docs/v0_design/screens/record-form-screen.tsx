"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Image as ImageIcon, X, ArrowLeft } from "lucide-react"

interface RecordFormProps {
  onBack?: () => void
}

export function RecordFormScreen({ onBack }: RecordFormProps) {
  const [type, setType] = useState<"advance" | "deposit">("advance")
  const [images, setImages] = useState<string[]>([])

  const addPlaceholderImage = () => {
    if (images.length < 2) {
      setImages([...images, `/placeholder-receipt-${images.length + 1}.jpg`])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"記録を登録"}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5">
        {/* Type Selector */}
        <div className="flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setType("advance")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              type === "advance"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {"立替"}
          </button>
          <button
            onClick={() => setType("deposit")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              type === "deposit"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {"預り"}
          </button>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{"金額"}</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              {"\u00A5"}
            </span>
            <Input
              type="number"
              placeholder="0"
              className="h-14 rounded-xl bg-card pl-10 text-right text-2xl font-bold tabular-nums"
            />
          </div>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{"日付"}</Label>
          <Input
            type="date"
            defaultValue={todayStr}
            className="h-12 rounded-xl bg-card text-base"
          />
        </div>

        {/* Label */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {"ラベル"}
            <span className="ml-1 text-xs text-destructive">{"*必須"}</span>
          </Label>
          <Input
            type="text"
            placeholder="例: スーパー買い物"
            className="h-12 rounded-xl bg-card text-base"
          />
        </div>

        {/* Memo */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            {"メモ"}
            <span className="ml-1 text-xs text-muted-foreground">{"任意"}</span>
          </Label>
          <Textarea
            placeholder="メモを入力..."
            className="min-h-20 rounded-xl bg-card text-base"
          />
        </div>

        {/* Receipt Images */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium text-foreground">
            {"レシート画像"}
            <span className="ml-1 text-xs text-muted-foreground">{"最大2枚"}</span>
          </Label>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl gap-2"
              onClick={addPlaceholderImage}
              disabled={images.length >= 2}
            >
              <Camera className="h-4 w-4" />
              {"撮影"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl gap-2"
              onClick={addPlaceholderImage}
              disabled={images.length >= 2}
            >
              <ImageIcon className="h-4 w-4" />
              {"ギャラリーから選択"}
            </Button>
          </div>
          {images.length > 0 && (
            <div className="flex gap-3">
              {images.map((_, i) => (
                <Card key={i} className="relative h-24 w-24 overflow-hidden border-0 bg-secondary">
                  <CardContent className="flex h-full items-center justify-center p-0">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </CardContent>
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button className="mt-2 h-12 rounded-xl text-base font-semibold">
          {"登録する"}
        </Button>
      </div>
    </div>
  )
}
