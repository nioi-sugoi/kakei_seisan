"use client"

type Screen =
  | "login"
  | "timeline-solo"
  | "timeline-managed"
  | "entry-form"
  | "entry-detail"
  | "settlement"
  | "partner-shared"
  | "partner-managed"
  | "approval"
  | "settings"
  | "settings-unconnected"
  | "invite-code"
  | "enter-code"

const screens: { value: Screen; label: string; group: string }[] = [
  { value: "login", label: "1. 認証画面", group: "認証" },
  { value: "timeline-solo", label: "2. タイムライン（ソロ）", group: "タイムライン" },
  { value: "timeline-managed", label: "3. タイムライン（管理）", group: "タイムライン" },
  { value: "entry-form", label: "4. 記録登録", group: "記録" },
  { value: "entry-detail", label: "5. 記録詳細", group: "記録" },
  { value: "settlement", label: "6. 精算実行", group: "精算" },
  { value: "partner-shared", label: "7. パートナー（共有）", group: "パートナー" },
  { value: "partner-managed", label: "8. パートナー（管理）", group: "パートナー" },
  { value: "approval", label: "9. 承認操作", group: "パートナー" },
  { value: "settings", label: "10. 設定", group: "設定" },
  { value: "invite-code", label: "11. 招待コード発行", group: "設定" },
  { value: "enter-code", label: "12. 招待コード入力", group: "設定" },
]

interface ScreenSelectorProps {
  screen: Screen
  onScreenChange: (screen: Screen) => void
}

export function ScreenSelector({ screen, onScreenChange }: ScreenSelectorProps) {
  return (
    <div className="w-full max-w-[900px] px-4 py-4">
      <h1 className="mb-3 text-center text-lg font-bold text-foreground">
        {"かんたん家計精算 - 画面一覧"}
      </h1>
      <div className="flex flex-wrap justify-center gap-2">
        {screens.map((s) => (
          <button
            key={s.value}
            onClick={() => onScreenChange(s.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              screen === s.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
