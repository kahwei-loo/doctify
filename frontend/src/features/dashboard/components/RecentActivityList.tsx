/**
 * RecentActivityList Component
 *
 * Combined activity list showing both documents and conversations.
 * Week 6 Dashboard Optimization
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MessageSquare, ArrowRight, Loader2, Activity } from "lucide-react";
import { useGetRecentActivityQuery, RecentActivity } from "@/store/api/dashboardApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecentActivityListProps {
  limit?: number;
  className?: string;
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({ limit = 5, className }) => {
  const navigate = useNavigate();
  const { data: response, isLoading, error } = useGetRecentActivityQuery({ limit });

  const activities = response?.data || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string, _activityType: string) => {
    const statusStyles: Record<string, string> = {
      completed: "bg-green-500/10 text-green-600",
      processed: "bg-green-500/10 text-green-600",
      resolved: "bg-green-500/10 text-green-600",
      processing: "bg-blue-500/10 text-blue-600",
      in_progress: "bg-blue-500/10 text-blue-600",
      pending: "bg-yellow-500/10 text-yellow-600",
      unresolved: "bg-yellow-500/10 text-yellow-600",
      failed: "bg-red-500/10 text-red-600",
    };

    return (
      <span
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
          statusStyles[status] || "bg-muted text-muted-foreground"
        )}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const getActivityIcon = (activity: RecentActivity) => {
    if (activity.activity_type === "conversation") {
      return (
        <div className="p-2 rounded-lg bg-purple-500/10">
          <MessageSquare className="h-4 w-4 text-purple-600" />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-lg bg-primary/10">
        <FileText className="h-4 w-4 text-primary" />
      </div>
    );
  };

  const handleActivityClick = (activity: RecentActivity) => {
    if (activity.activity_type === "document") {
      navigate(`/documents/${activity.activity_id}`);
    } else if (activity.activity_type === "conversation") {
      const assistantId = activity.metadata?.assistant_id as string;
      if (assistantId) {
        navigate(`/assistants/${assistantId}/conversations/${activity.activity_id}`);
      }
    }
  };

  const truncateTitle = (title: string, maxLength: number = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest documents and conversations</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/documents")}>
          View all
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load activity</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No activity yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload documents or start a conversation to see activity.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={`${activity.activity_type}-${activity.activity_id}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleActivityClick(activity)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getActivityIcon(activity)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{truncateTitle(activity.title)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.subtitle && (
                        <>
                          <span className="text-primary truncate max-w-[120px]">
                            {activity.subtitle}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDate(activity.timestamp)}</span>
                      {activity.activity_type === "conversation" &&
                        typeof activity.metadata?.message_count === "number" && (
                          <>
                            <span>•</span>
                            <span>{String(activity.metadata.message_count)} messages</span>
                          </>
                        )}
                    </div>
                  </div>
                </div>
                {getStatusBadge(activity.status, activity.activity_type)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityList;
