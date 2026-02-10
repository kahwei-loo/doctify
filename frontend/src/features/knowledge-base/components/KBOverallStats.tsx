/**
 * KBOverallStats Component
 *
 * Context-aware statistics display for knowledge bases.
 * Pattern: Based on ProjectStats.tsx
 *
 * Features:
 * - Global context: Total KBs, Data Sources, Documents, Embeddings (across ALL KBs)
 * - Single context: Data Sources, Documents, Embeddings, Vector DB Size (for specific KB)
 * - Loading skeleton states
 * - Responsive grid layout
 */

import React from 'react';
import { Database, FileStack, FileText, Zap, AlertCircle, HardDrive, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { KnowledgeBaseStats, SingleKBStats } from '../types';

interface KBOverallStatsProps {
  /** Context mode: global (all KBs) or single (specific KB) */
  context: 'global' | 'single';
  /** Statistics data - type depends on context */
  data: KnowledgeBaseStats | SingleKBStats | null | undefined;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Custom class name */
  className?: string;
}

/**
 * Format large numbers with K/M suffix
 */
const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) {
    return '0';
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
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
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn('rounded-full p-3 bg-primary/10', iconClassName)}>
            {icon}
          </div>
        </div>
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
        <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No knowledge bases yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Create your first knowledge base to get started
        </p>
      </CardContent>
    </Card>
  );
};

export const KBOverallStats: React.FC<KBOverallStatsProps> = ({
  context,
  data,
  isLoading = false,
  error,
  className,
}) => {
  // Loading state
  if (isLoading) {
    const skeletonCount = 4;
    return (
      <div
        className={cn(
          'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
          className
        )}
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
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

  // Empty state (only for global context)
  if (context === 'global' && (!data || (data as KnowledgeBaseStats).total_knowledge_bases === 0)) {
    return (
      <div className={cn('grid gap-4 grid-cols-1', className)}>
        <EmptyState />
      </div>
    );
  }

  // Global Context: Show aggregated statistics across ALL KBs
  if (context === 'global') {
    const globalData = data as KnowledgeBaseStats;
    return (
      <div
        className={cn(
          'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
          className
        )}
      >
        {/* Total Knowledge Bases */}
        <StatCard
          title="Knowledge Bases"
          value={formatNumber(globalData.total_knowledge_bases)}
          subtitle="Active knowledge bases"
          icon={<Database className="h-5 w-5 text-primary" />}
        />

        {/* Total Data Sources */}
        <StatCard
          title="Data Sources"
          value={formatNumber(globalData.total_data_sources)}
          subtitle="Connected sources across all KBs"
          icon={<FileStack className="h-5 w-5 text-blue-500" />}
          iconClassName="bg-blue-500/10"
        />

        {/* Total Embeddings */}
        <StatCard
          title="Embeddings"
          value={formatNumber(globalData.total_embeddings)}
          subtitle="Vector embeddings across all KBs"
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
          iconClassName="bg-yellow-500/10"
        />

        {/* Total Files */}
        <StatCard
          title="Uploaded Files"
          value={formatNumber(globalData.total_documents)}
          subtitle="Files uploaded across all KBs"
          icon={<FileText className="h-5 w-5 text-green-500" />}
          iconClassName="bg-green-500/10"
        />
      </div>
    );
  }

  // Single Context: Show statistics for specific KB only
  const singleData = data as SingleKBStats;
  if (!singleData) return null;

  // Calculate vector DB size estimate (rough approximation: 1536 dimensions * 4 bytes per float)
  const vectorSizeBytes = (singleData.embedding_count || 0) * 1536 * 4;
  const vectorSizeMB = vectorSizeBytes / (1024 * 1024);
  const vectorSizeDisplay =
    vectorSizeMB < 1
      ? `${(vectorSizeMB * 1024).toFixed(0)} KB`
      : `${vectorSizeMB.toFixed(1)} MB`;

  return (
    <div
      className={cn(
        'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {/* Data Sources */}
      <StatCard
        title="Data Sources"
        value={formatNumber(singleData.data_source_count)}
        subtitle="Connected sources"
        icon={<FileStack className="h-5 w-5 text-blue-500" />}
        iconClassName="bg-blue-500/10"
      />

      {/* Uploaded Files */}
      <StatCard
        title="Uploaded Files"
        value={formatNumber(singleData.document_count)}
        subtitle="Files uploaded"
        icon={<FileText className="h-5 w-5 text-green-500" />}
        iconClassName="bg-green-500/10"
      />

      {/* Embeddings */}
      <StatCard
        title="Embeddings"
        value={formatNumber(singleData.embedding_count)}
        subtitle="Vector embeddings"
        icon={<Zap className="h-5 w-5 text-yellow-500" />}
        iconClassName="bg-yellow-500/10"
      />

      {/* Vector DB Size */}
      <StatCard
        title="Vector DB Size"
        value={vectorSizeDisplay}
        subtitle="Estimated storage"
        icon={<HardDrive className="h-5 w-5 text-purple-500" />}
        iconClassName="bg-purple-500/10"
      />
    </div>
  );
};

export default KBOverallStats;
