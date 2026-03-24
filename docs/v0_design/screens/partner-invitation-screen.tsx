"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Mail, Clock, Send, Check, X } from "lucide-react"

export function PartnerInvitationScreen() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {/* Invitation Form */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 px-5 py-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {"パートナーを招待"}
          </h3>
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium text-foreground">
              {"メールアドレス"}
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="partner@example.com"
                className="h-11 flex-1 rounded-xl bg-card text-base"
              />
              <Button className="h-11 rounded-xl px-6 font-semibold">
                <Send className="mr-1.5 h-4 w-4" />
                {"招待"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sent Invitations */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 px-5 py-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {"送信した招待"}
          </h3>
          {/* Active invitation */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {"yukari@example.com"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-md text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                  {"招待中"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {"残り 23時間"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-destructive text-xs text-destructive hover:bg-destructive/5"
            >
              <X className="mr-1 h-3 w-3" />
              {"取消"}
            </Button>
          </div>
          {/* Expired invitation */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3 opacity-60">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {"old@example.com"}
                </span>
              </div>
              <Badge variant="outline" className="w-fit rounded-md text-[10px] bg-secondary text-muted-foreground border-border">
                {"期限切れ"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Received Invitations */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 px-5 py-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {"受信した招待"}
          </h3>
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {"田中 太郎さんからの招待"}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {"tanaka@example.com"}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {"残り 45時間"}
              </span>
            </div>
            <Button
              size="sm"
              className="h-9 rounded-lg bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-600"
            >
              <Check className="mr-1 h-4 w-4" />
              {"承認"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
