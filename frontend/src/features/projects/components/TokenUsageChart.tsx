/**
 * TokenUsageChart Component
 *
 * Displays token usage by project as a bar chart.
 * Shows AI token consumption across different projects.
 *
 * Features:
 * - Horizontal bar chart
 * - Interactive tooltips
 * - Project color coding
 * - Responsive design
 * - Loading and empty states
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { getProjectColor } from '@/components/ui/project-avatar';

export interface TokenUsageByProject {
  projectId: string;
  projectName: string;
  tokens: number;
}

interface TokenUsageChartProps {
  /** Token usage data by project */
  data: TokenUsageByProject[] | null | undefined;
  /** Loading state */
  isLoading?: boolean;
  /** Chart title */
  title?: string;
  /** Custom class name */
  className?: string;
  /** Show as card */
  showCard?: boolean;
  /** Chart height */
  height?: number;
  /** Maximum projects to show */
  maxProjects?: number;
}

/**
 * Format token count
 */
const formatTokens = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Custom tooltip component
 */
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { name: string; color: string; tokens: number };
  }>;
}> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-medium">{data.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {data.tokens.toLocaleString()} tokens
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Loading skeleton
 */
const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => {
  return (
    <div className="space-y-3" style={{ height }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 h-4 bg-muted rounded animate-pulse" />
          <div
            className="h-6 bg-muted rounded animate-pulse"
            style={{ width: `${100 - i * 20}%` }}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Empty state
 */
const EmptyState: React.FC<{ height: number }> = ({ height }) => {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ height }}
    >
      <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">No token usage data</p>
    </div>
  );
};

const ChartContent: React.FC<{
  data: TokenUsageByProject[] | null | undefined;
  isLoading?: boolean;
  height: number;
  maxProjects: number;
}> = ({ data, isLoading, height, maxProjects }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort by tokens descending and take top N
    return data
      .slice()
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, maxProjects)
      .map((item) => ({
        name: item.projectName.length > 15
          ? `${item.projectName.slice(0, 15)}...`
          : item.projectName,
        fullName: item.projectName,
        tokens: item.tokens,
        color: getProjectColor(item.projectName),
      }));
  }, [data, maxProjects]);

  const totalTokens = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.tokens, 0);
  }, [data]);

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState height={height} />;
  }

  return (
    <div>
      {/* Summary */}
      <div className="mb-4 text-sm text-muted-foreground">
        Total: <span className="font-medium text-foreground">{formatTokens(totalTokens)}</span> tokens
        {data.length > maxProjects && (
          <span className="ml-2">
            (showing top {maxProjects} of {data.length} projects)
          </span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={formatTokens}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar
            dataKey="tokens"
            radius={[0, 4, 4, 0]}
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TokenUsageChart: React.FC<TokenUsageChartProps> = ({
  data,
  isLoading = false,
  title = 'Token Usage by Project',
  className,
  showCard = true,
  height = 200,
  maxProjects = 5,
}) => {
  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContent
            data={data}
            isLoading={isLoading}
            height={height}
            maxProjects={maxProjects}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <ChartContent
        data={data}
        isLoading={isLoading}
        height={height}
        maxProjects={maxProjects}
      />
    </div>
  );
};

export default TokenUsageChart;
