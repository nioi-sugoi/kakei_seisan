"use client"

import { useState } from "react"
import { DisplayImage } from "@/lib/types"
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react"

interface ImageViewerModalProps {
  images: DisplayImage[]
  initialIndex?: number
  onClose?: () => void
}

/**
 * フルスクリーン画像ビューアーモーダル
 *
 * 設計方針:
 * - ダークオーバーレイ上に画像をフルサイズ表示
 * - ×ボタン（右上）で閉じる。実装時は下スワイプでも閉じられるようにする
 * - ピンチズーム / ダブルタップズームは実装時に react-native-gesture-handler で対応
 * - 複数枚時はスワイプナビゲーション＋ドットインジケーター
 * - 管理者がレシート金額を拡大確認するユースケースに対応
 */
export function ImageViewerModal({
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const hasMultiple = images.length > 1

  const goNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">
          {hasMultiple ? `${currentIndex + 1} / ${images.length}` : ""}
        </span>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Image Area */}
      <div className="relative flex flex-1 items-center justify-center px-4">
        {/* Prev Arrow */}
        {hasMultiple && currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Mock Full Image */}
        <div className="flex h-[480px] w-full max-w-[340px] flex-col items-start gap-2 rounded-lg bg-white p-6">
          {/* 疑似レシート画像（フルサイズ） */}
          <div className="mb-2 text-center w-full">
            <div className="mx-auto h-2 w-24 rounded-full bg-muted-foreground/15" />
          </div>
          <div className="h-2 w-32 rounded-full bg-muted-foreground/10" />
          <div className="h-2 w-40 rounded-full bg-muted-foreground/15" />
          <div className="h-2 w-28 rounded-full bg-muted-foreground/10" />
          <div className="my-1 h-px w-full bg-muted-foreground/10" />
          <div className="h-2 w-36 rounded-full bg-muted-foreground/12" />
          <div className="h-2 w-20 rounded-full bg-muted-foreground/10" />
          <div className="h-2 w-44 rounded-full bg-muted-foreground/15" />
          <div className="h-2 w-24 rounded-full bg-muted-foreground/10" />
          <div className="my-1 h-px w-full bg-muted-foreground/10" />
          <div className="h-2 w-28 rounded-full bg-muted-foreground/12" />
          <div className="h-2 w-32 rounded-full bg-muted-foreground/10" />
          <div className="mt-auto flex w-full justify-between">
            <div className="h-2.5 w-16 rounded-full bg-muted-foreground/20" />
            <div className="h-2.5 w-20 rounded-full bg-muted-foreground/25" />
          </div>
        </div>

        {/* Next Arrow */}
        {hasMultiple && currentIndex < images.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4">
        {/* Dot Indicators */}
        {hasMultiple && (
          <div className="flex gap-2">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === currentIndex ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* Zoom Hint */}
        <div className="flex items-center gap-1.5 text-white/50">
          <ZoomIn className="h-4 w-4" />
          <span className="text-xs">{"ピンチ操作またはダブルタップで拡大"}</span>
        </div>
      </div>
    </div>
  )
}
