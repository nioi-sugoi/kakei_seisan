"use client"

import { DisplayImage } from "@/lib/types"
import { Image as ImageIcon, AlertCircle } from "lucide-react"

interface ImageThumbnailProps {
  image: DisplayImage
  size?: "sm" | "md"
  onTap?: (image: DisplayImage) => void
}

/**
 * 画像サムネイル表示コンポーネント
 *
 * 3つの状態を表現:
 * - loading: パルスアニメーション付きスケルトン
 * - loaded: object-cover で画像表示
 * - error: フォールバックアイコン
 */
export function ImageThumbnail({ image, size = "md", onTap }: ImageThumbnailProps) {
  const sizeClass = size === "sm" ? "h-16 w-16" : "h-24 w-24"

  if (image.loadState === "loading") {
    return (
      <div className={`${sizeClass} animate-pulse rounded-lg bg-secondary`} />
    )
  }

  if (image.loadState === "error") {
    return (
      <div
        className={`${sizeClass} flex flex-col items-center justify-center gap-1 rounded-lg bg-secondary`}
      >
        <AlertCircle className="h-5 w-5 text-muted-foreground/40" />
        <span className="text-[10px] text-muted-foreground/60">{"読込失敗"}</span>
      </div>
    )
  }

  return (
    <button
      onClick={() => onTap?.(image)}
      className={`${sizeClass} overflow-hidden rounded-lg bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50`}
    >
      {/* デザインモックでは疑似レシート画像を表示 */}
      <div className="relative h-full w-full">
        <div className="flex h-full w-full flex-col items-start gap-[3px] bg-white p-2">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/15" />
          <div className="h-1.5 w-14 rounded-full bg-muted-foreground/10" />
          <div className="h-1.5 w-8 rounded-full bg-muted-foreground/15" />
          <div className="mt-auto h-1.5 w-12 rounded-full bg-muted-foreground/20" />
          <div className="h-1.5 w-6 rounded-full bg-muted-foreground/10" />
        </div>
        {/* タップ可能なヒント */}
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors hover:bg-foreground/5">
          <ImageIcon className="h-5 w-5 text-muted-foreground/20" />
        </div>
      </div>
    </button>
  )
}

interface ImageThumbnailGroupProps {
  images: DisplayImage[]
  label: string
  onImageTap?: (image: DisplayImage, index: number) => void
}

/**
 * 画像サムネイルグループ（ラベル＋サムネイル一覧＋タップヒント）
 */
export function ImageThumbnailGroup({ images, label, onImageTap }: ImageThumbnailGroupProps) {
  if (images.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-3">
        {images.map((img, i) => (
          <ImageThumbnail
            key={img.id}
            image={img}
            onTap={() => onImageTap?.(img, i)}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{"タップで拡大表示"}</span>
    </div>
  )
}
