/**
 * ProjectStats Component
 *
 * Displays project statistics in a card grid layout.
 * Shows total documents, success rate, token usage, and estimated cost.
 *
 * Features:
 * - Animated number counters
 * - Status breakdown visualization
 * - Loading skeleton states
 * - Responsive grid layout
 */

import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Coins,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

/**
 * Project statistics data structure
 */
export interface ProjectStatsData {
  totalDocuments: number;
  successRate: number;
  totalTokens: number;
  estimatedCost: number;
  statusBreakdown: {
    completed: number;
    processing: number;
    failed: number;
    pending?: number;
  };
  tokenByProject?: Array<{
    projectId: string;
    projectName: string;
    tokens: number;
  }>;
  trend?: {
    documents: number; // percentage change
    successRate: number;
    tokens: number;
    cost: number;
  };
}

interface ProjectStatsProps {
  /** Statistics data */
  data: ProjectStatsData | null | undefined;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Custom class name */
  className?: string;
  /** Show compact version */
  compact?: boolean;
}

/**
 * Format large numbers with K/M suffix
 */
const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
};

/**
 * Format currency
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format percentage
 */
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Trend indicator component
 */
const TrendIndicator: React.FC<{ value: number; inverse?: boolean }> = ({
  value,
  inverse = false,
}) => {
  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-500' : 'text-red-500';

  if (value === 0) return null;

  return (
    <div className={cn('flex items-center gap-0.5 text-xs', colorClass)}>
      <Icon className="h-3 w-3" />
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
};

/**
 * Stat card component
 */
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconClassName?: string;
  trend?: number;
  trendInverse?: boolean;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
  trend,
  trendInverse,
  children,
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== undefined && (
                <TrendIndicator value={trend} inverse={trendInverse} />
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'rounded-full p-3 bg-primary/10',
              iconClassName
            )}
          >
            {icon}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton for stat card
 */
const StatCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Status breakdown component
 */
const StatusBreakdown: React.FC<{
  breakdown: ProjectStatsData['statusBreakdown'];
  total: number;
}> = ({ breakdown, total }) => {
  const items = useMemo(() => {
    const totalItems = breakdown.completed + breakdown.processing + breakdown.failed + (breakdown.pending || 0);

    return [
      {
        label: 'Completed',
        value: breakdown.completed,
        percentage: totalItems > 0 ? (breakdown.completed / totalItems) * 100 : 0,
        icon: <CheckCircle2 className="h-3 w-3" />,
        colorClass: 'text-green-500 bg-green-500',
      },
      {
        label: 'Processing',
        value: breakdown.processing,
        percentage: totalItems > 0 ? (breakdown.processing / totalItems) * 100 : 0,
        icon: <Loader2 className="h-3 w-3" />,
        colorClass: 'text-blue-500 bg-blue-500',
      },
      {
        label: 'Pending',
        value: breakdown.pending || 0,
        percentage: totalItems > 0 ? ((breakdown.pending || 0) / totalItems) * 100 : 0,
        icon: <Clock className="h-3 w-3" />,
        colorClass: 'text-yellow-500 bg-yellow-500',
      },
      {
        label: 'Failed',
        value: breakdown.failed,
        percentage: totalItems > 0 ? (breakdown.failed / totalItems) * 100 : 0,
        icon: <XCircle className="h-3 w-3" />,
        colorClass: 'text-red-500 bg-red-500',
      },
    ].filter(item => item.value > 0);
  }, [breakdown]);

  return (
    <div className="mt-4 space-y-3">
      {/* Stacked bar */}
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn('transition-all', item.colorClass.split(' ')[1])}
            style={{ width: `${item.percentage}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs">
            <div className={cn('h-2 w-2 rounded-full', item.colorClass.split(' ')[1])} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Error state component
 */
const ErrorState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC = () => {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No statistics available yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Upload and process documents to see statistics
        </p>
      </CardContent>
    </Card>
  );
};

export const ProjectStats: React.FC<ProjectStatsProps> = ({
  data,
  isLoading = false,
  error,
  className,
  compact = false,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('grid gap-4 grid-cols-1', className)}>
        <ErrorState message={error} />
      </div>
    );
  }

  // Empty state
  if (!data || data.totalDocuments === 0) {
    return (
      <div className={cn('grid gap-4 grid-cols-1', className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Total Documents */}
      <StatCard
        title="Total Documents"
        value={formatNumber(data.totalDocuments)}
        subtitle={`${data.statusBreakdown.completed} completed`}
        icon={<FileText className="h-5 w-5 text-primary" />}
        trend={data.trend?.documents}
      >
        <StatusBreakdown
          breakdown={data.statusBreakdown}
          total={data.totalDocuments}
        />
      </StatCard>

      {/* Success Rate */}
      <StatCard
        title="Success Rate"
        value={formatPercent(data.successRate)}
        subtitle={`${data.statusBreakdown.failed} failed`}
        icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
        iconClassName="bg-green-500/10"
        trend={data.trend?.successRate}
      >
        <div className="mt-4">
          <Progress
            value={data.successRate}
            className="h-2"
          />
        </div>
      </StatCard>

      {/* Total Tokens */}
      <StatCard
        title="Total Tokens"
        value={formatNumber(data.totalTokens)}
        subtitle="AI processing usage"
        icon={<Zap className="h-5 w-5 text-yellow-500" />}
        iconClassName="bg-yellow-500/10"
        trend={data.trend?.tokens}
        trendInverse
      />

      {/* Estimated Cost */}
      <StatCard
        title="Estimated Cost"
        value={formatCurrency(data.estimatedCost)}
        subtitle="Based on token usage"
        icon={<Coins className="h-5 w-5 text-emerald-500" />}
        iconClassName="bg-emerald-500/10"
        trend={data.trend?.cost}
        trendInverse
      />
    </div>
  );
};

export default ProjectStats;
