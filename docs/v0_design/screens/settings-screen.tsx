"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  User,
  Mail,
  Users,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react"

interface SettingsScreenProps {
  isPartnerConnected?: boolean
  isManaged?: boolean
  onInvite?: () => void
}

export function SettingsScreen({
  isPartnerConnected = true,
  isManaged = true,
  onInvite,
}: SettingsScreenProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {/* Profile */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 px-5 py-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {"プロフィール"}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-foreground">
                {"田中 太郎"}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {"tanaka@example.com"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 px-5 py-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {"パートナー管理"}
          </h3>
          {isPartnerConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-foreground">
                  {"ゆかり"}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {"yukari@example.com"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="h-12 justify-between rounded-xl text-base"
                onClick={onInvite}
              >
                <span>{"パートナーを招待"}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Management Mode */}
      {isPartnerConnected && isManaged && (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col gap-4 px-5 py-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Shield className="h-4 w-4" />
              {"管理モード"}
            </h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="self-manage" className="text-sm font-medium text-foreground">
                {"自分の管理モード"}
              </Label>
              <Switch id="self-manage" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="partner-manage" className="text-sm font-medium text-foreground">
                {"パートナーの管理モード"}
              </Label>
              <Switch id="partner-manage" defaultChecked />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <Button
        variant="outline"
        className="h-12 rounded-xl border-destructive text-base font-medium text-destructive hover:bg-destructive/5"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {"ログアウト"}
      </Button>
    </div>
  )
}
