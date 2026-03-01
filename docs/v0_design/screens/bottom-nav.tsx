"use client"

import { Clock, Users, Settings } from "lucide-react"

interface BottomNavProps {
  activeTab: "timeline" | "partner" | "settings"
  hasPartnerTab: boolean
  isManaged: boolean
  pendingCount: number
  onTabChange: (tab: "timeline" | "partner" | "settings") => void
}

export function BottomNav({
  activeTab,
  hasPartnerTab,
  pendingCount,
  onTabChange,
}: BottomNavProps) {
  return (
    <nav className="flex h-[68px] items-center justify-around border-t border-border bg-card px-2">
      <button
        onClick={() => onTabChange("timeline")}
        className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
          activeTab === "timeline" ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Clock className="h-5 w-5" />
        <span className="text-[10px] font-medium">{"タイムライン"}</span>
      </button>

      {hasPartnerTab && (
        <button
          onClick={() => onTabChange("partner")}
          className={`relative flex flex-col items-center gap-0.5 px-4 py-1 ${
            activeTab === "partner" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div className="relative">
            <Users className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{"パートナー"}</span>
        </button>
      )}

      <button
        onClick={() => onTabChange("settings")}
        className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
          activeTab === "settings" ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Settings className="h-5 w-5" />
        <span className="text-[10px] font-medium">{"設定"}</span>
      </button>
    </nav>
  )
}
