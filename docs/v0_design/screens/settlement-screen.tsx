"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Camera, Image as ImageIcon, X } from "lucide-react"

interface SettlementScreenProps {
  balance: number
  onBack?: () => void
}

export function SettlementScreen({ balance, onBack }: SettlementScreenProps) {
  const isPositive = balance >= 0
  const absBalance = Math.abs(balance)
  const [amount, setAmount] = useState(absBalance.toString())
  const [images, setImages] = useState<string[]>([])

  const addPlaceholderImage = () => {
    if (images.length < 2) {
      setImages([...images, `placeholder-${images.length + 1}`])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"精算"}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5">
        {/* Current Balance */}
        <Card className="border-0 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-2 px-5 py-5">
            <span className="text-sm text-muted-foreground">{"現在の残高"}</span>
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {`\u00A5${absBalance.toLocaleString()}`}
            </span>
            <span className="text-sm font-medium text-primary">
              {isPositive ? "家計から受け取る額" : "家計に入金する額"}
            </span>
          </CardContent>
        </Card>

        {/* Settlement Amount */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{"精算額"}</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              {"\u00A5"}
            </span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 rounded-xl bg-card pl-10 text-right text-2xl font-bold tabular-nums"
            />
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl text-sm font-medium"
            onClick={() => setAmount(absBalance.toString())}
          >
            {"全額精算"}
          </Button>
        </div>

        {/* Evidence Images */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium text-foreground">
            {"証跡画像"}
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
              {"選択"}
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
        <Button className="mt-auto h-12 rounded-xl text-base font-semibold">
          {"精算を実行する"}
        </Button>
      </div>
    </div>
  )
}
