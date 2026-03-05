/**
 * AssistantAnalyticsDialog Component
 *
 * Dialog showing analytics for an assistant with period selector.
 * Uses the existing getAssistantAnalytics RTK Query endpoint.
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  MessageSquare,
  CheckCircle2,
  MessagesSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useGetAssistantAnalyticsQuery } from "@/store/api/assistantsApi";
import { cn } from "@/lib/utils";
import type { Assistant } from "../types";

interface AssistantAnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
  assistant: Assistant;
}

const PERIODS = [
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
  { label: "90 days", value: "90d" },
] as const;

export const AssistantAnalyticsDialog: React.FC<AssistantAnalyticsDialogProps> = ({
  open,
  onClose,
  assistant,
}) => {
  const [period, setPeriod] = useState<string>("month");

  const {
    data: analytics,
    isLoading,
    isError,
  } = useGetAssistantAnalyticsQuery(
    { assistantId: assistant.assistant_id, period },
    { skip: !open }
  );

  const stats = [
    {
      label: "Total Conversations",
      value: analytics?.conversation_count ?? 0,
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Total Messages",
      value: analytics?.message_count ?? 0,
      icon: MessagesSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Resolution Rate",
      value: analytics ? `${Math.round(analytics.resolution_rate * 100)}%` : "0%",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Avg Messages/Conv",
      value: analytics
        ? analytics.conversation_count > 0
          ? (analytics.message_count / analytics.conversation_count).toFixed(1)
          : "0"
        : "0",
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base">Analytics: {assistant.name}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Period Selector */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className="text-xs h-7 px-3"
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Failed to load analytics. The backend may not support this endpoint yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg p-2", stat.bgColor)}>
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
