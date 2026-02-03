/**
 * ProcessingChart Component
 *
 * Displays document processing status breakdown as a donut chart.
 * Shows completed, processing, pending, and failed documents.
 *
 * Features:
 * - Animated donut chart
 * - Interactive legend
 * - Responsive design
 * - Loading and empty states
 */

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

export interface ProcessingChartData {
  completed: number;
  processing: number;
  pending?: number;
  failed: number;
}

interface ProcessingChartProps {
  /** Processing status data */
  data: ProcessingChartData | null | undefined;
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
}

// Chart colors
const COLORS = {
  completed: '#22c55e', // green-500
  processing: '#3b82f6', // blue-500
  pending: '#eab308', // yellow-500
  failed: '#ef4444', // red-500
};

const LABELS = {
  completed: 'Completed',
  processing: 'Processing',
  pending: 'Pending',
  failed: 'Failed',
};

/**
 * Custom tooltip component
 */
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; fill: string } }>;
}> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="font-medium">{data.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {data.value} documents
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Custom legend component
 */
const CustomLegend: React.FC<{
  payload?: Array<{ value: string; color: string; payload: { value: number } }>;
}> = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
          <span className="text-sm font-medium">({entry.payload.value})</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Loading skeleton
 */
const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
        <div className="absolute inset-6 rounded-full bg-background" />
      </div>
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
      <PieChartIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">No data available</p>
    </div>
  );
};

const ChartContent: React.FC<{
  data: ProcessingChartData | null | undefined;
  isLoading?: boolean;
  height: number;
}> = ({ data, isLoading, height }) => {
  const chartData = useMemo(() => {
    if (!data) return [];

    return [
      { name: LABELS.completed, value: data.completed, fill: COLORS.completed },
      { name: LABELS.processing, value: data.processing, fill: COLORS.processing },
      { name: LABELS.pending, value: data.pending ?? 0, fill: COLORS.pending },
      { name: LABELS.failed, value: data.failed, fill: COLORS.failed },
    ].filter((item) => item.value > 0);
  }, [data]);

  const total = useMemo(() => {
    if (!data) return 0;
    return data.completed + data.processing + (data.pending ?? 0) + data.failed;
  }, [data]);

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (!data || total === 0) {
    return <EmptyState height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
        >
          <tspan x="50%" dy="-0.5em" className="text-2xl font-bold">
            {total}
          </tspan>
          <tspan x="50%" dy="1.5em" className="text-xs fill-muted-foreground">
            Total
          </tspan>
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};

export const ProcessingChart: React.FC<ProcessingChartProps> = ({
  data,
  isLoading = false,
  title = 'Processing Status',
  className,
  showCard = true,
  height = 250,
}) => {
  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContent data={data} isLoading={isLoading} height={height} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <ChartContent data={data} isLoading={isLoading} height={height} />
    </div>
  );
};

export default ProcessingChart;
