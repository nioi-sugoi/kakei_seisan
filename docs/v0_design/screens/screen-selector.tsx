"use client"

type Screen =
  | "login"
  | "otp"
  | "timeline-solo"
  | "timeline-managed"
  | "entry-form"
  | "entry-detail"
  | "entry-detail-cancelled"
  | "settlement"
  | "partner-invitation"
  | "partner-shared"
  | "partner-managed"
  | "approval"
  | "settings"
  | "settings-unconnected"

const screens: { value: Screen; label: string; group: string }[] = [
  { value: "login", label: "1. ログイン", group: "認証" },
  { value: "otp", label: "2. OTP認証コード", group: "認証" },
  { value: "timeline-solo", label: "3. タイムライン（ソロ）", group: "タイムライン" },
  { value: "timeline-managed", label: "4. タイムライン（管理）", group: "タイムライン" },
  { value: "entry-form", label: "5. 記録登録", group: "記録" },
  { value: "entry-detail", label: "6. 記録詳細", group: "記録" },
  { value: "entry-detail-cancelled", label: "7. 記録詳細（取消）", group: "記録" },
  { value: "settlement", label: "8. 精算", group: "精算" },
  { value: "partner-invitation", label: "9. パートナー招待", group: "パートナー" },
  { value: "partner-shared", label: "10. パートナー（共有）", group: "パートナー" },
  { value: "partner-managed", label: "11. パートナー（管理）", group: "パートナー" },
  { value: "approval", label: "12. 承認操作", group: "パートナー" },
  { value: "settings", label: "13. 設定", group: "設定" },
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
