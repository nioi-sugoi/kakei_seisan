"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Image as ImageIcon, X, ArrowLeft } from "lucide-react"
import { ImageThumbnail } from "./image-thumbnail"
import { DisplayImage } from "@/lib/types"

interface EntryEditFormProps {
  onBack?: () => void
}

/**
 * 記録修正フォーム画面
 *
 * 修正時に既存のレシート画像をプリセット表示する。
 * 画像は originalId に紐付いているため、修正しても画像は引き継がれる。
 * 既存画像はタップで拡大表示可能、×ボタンで削除可能。
 * 新しい画像の追加も可能（合計2枚まで）。
 */
export function EntryEditFormScreen({ onBack }: EntryEditFormProps) {
  // 修正元の既存画像（モック）
  const [existingImages] = useState<DisplayImage[]>([
    {
      id: "existing-1",
      thumbnailUrl: "/mock-images/existing-1-thumb.jpg",
      fullUrl: "/mock-images/existing-1-full.jpg",
      loadState: "loaded",
    },
  ])
  const [newImages, setNewImages] = useState<string[]>([])
  const totalImages = existingImages.length + newImages.length

  const addPlaceholderImage = () => {
    if (totalImages < 2) {
      setNewImages([...newImages, `new-${newImages.length + 1}`])
    }
  }

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{"戻る"}</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">{"記録を修正"}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5">
        {/* Type (read-only) */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-md text-xs font-medium bg-primary/10 text-primary border-primary/20"
          >
            {"立替"}
          </Badge>
          <span className="text-xs text-muted-foreground">{"種別・日付は変更できません"}</span>
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
              defaultValue="4280"
              className="h-14 rounded-xl bg-card pl-10 text-right text-2xl font-bold tabular-nums"
            />
          </div>
        </div>

        {/* Date (read-only) */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{"日付"}</Label>
          <Input
            type="date"
            defaultValue="2026-03-15"
            className="h-12 rounded-xl bg-secondary text-base"
            disabled
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
            defaultValue="スーパー買い物"
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
            defaultValue="夕食の材料"
            className="min-h-20 rounded-xl bg-card text-base"
          />
        </div>

        {/* Receipt Images - Existing + New */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium text-foreground">
            {"レシート画像"}
            <span className="ml-1 text-xs text-muted-foreground">{"最大2枚"}</span>
          </Label>

          {/* Existing images */}
          <div className="flex gap-3">
            {existingImages.map((img) => (
              <div key={img.id} className="relative">
                <ImageThumbnail image={img} />
                <button className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {newImages.map((_, i) => (
              <Card key={`new-${i}`} className="relative h-24 w-24 overflow-hidden border-0 bg-secondary">
                <CardContent className="flex h-full items-center justify-center p-0">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </CardContent>
                <button
                  onClick={() => removeNewImage(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </Card>
            ))}
          </div>

          {/* Add buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl gap-2"
              onClick={addPlaceholderImage}
              disabled={totalImages >= 2}
            >
              <Camera className="h-4 w-4" />
              {"撮影"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl gap-2"
              onClick={addPlaceholderImage}
              disabled={totalImages >= 2}
            >
              <ImageIcon className="h-4 w-4" />
              {"選択"}
            </Button>
          </div>
        </div>

        {/* Submit */}
        <Button className="mt-2 h-12 rounded-xl text-base font-semibold">
          {"修正する"}
        </Button>
      </div>
    </div>
  )
}
