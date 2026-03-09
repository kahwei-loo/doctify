/**
 * StatCardWithTrend Component
 *
 * Enhanced stat card with week-over-week trend indicator.
 * Week 6 Dashboard Optimization
 */

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TrendData {
  percent: number;
  direction: "up" | "down" | "neutral";
}

export interface StatCardWithTrendProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: TrendData;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
}

const StatCardWithTrend: React.FC<StatCardWithTrendProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
  isLoading = false,
}) => {
  const variantStyles = {
    default: "bg-muted/50",
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    danger: "bg-red-500/10 text-red-600",
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case "up":
        return <TrendingUp className="h-3 w-3" />;
      case "down":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendStyles = () => {
    if (!trend) return "";

    switch (trend.direction) {
      case "up":
        return "text-green-600 bg-green-500/10";
      case "down":
        return "text-red-600 bg-red-500/10";
      default:
        return "text-muted-foreground bg-muted/50";
    }
  };

  const formatTrendPercent = () => {
    if (!trend) return "";
    const sign = trend.direction === "up" ? "+" : trend.direction === "down" ? "" : "";
    return `${sign}${Math.abs(trend.percent).toFixed(0)}%`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-3xl font-bold tabular-nums">{value}</p>
                {trend && trend.percent !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium",
                      getTrendStyles()
                    )}
                  >
                    {getTrendIcon()}
                    {formatTrendPercent()}
                  </span>
                )}
              </div>
            )}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={cn("p-3 rounded-lg", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCardWithTrend;
