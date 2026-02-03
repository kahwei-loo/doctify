/**
 * ChartRenderer Component
 *
 * Renders different chart types based on ChartConfig from query responses.
 * Supports: metric_card, bar, line, pie, table
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ChartConfig, ChartType } from '../types';

interface ChartRendererProps {
  chart: ChartConfig;
  className?: string;
  height?: number;
}

// Color palette for charts
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#ef4444', // red-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

/**
 * Custom tooltip for recharts
 */
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
        {label && <p className="font-medium text-sm mb-1">{label}</p>}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Metric Card - Single value display
 */
const MetricCard: React.FC<{
  config: Record<string, any>;
  data?: Record<string, any>[];
}> = ({ config, data }) => {
  const value = data?.[0]?.value ?? config.value ?? 0;
  const label = config.label || 'Value';
  const previousValue = config.previousValue;
  const format = config.format || 'number';

  const formattedValue = useMemo(() => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: config.currency || 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (format === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
  }, [value, format, config.currency]);

  const change = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-4xl font-bold tracking-tight">{formattedValue}</p>
          {change !== null && (
            <div
              className={cn(
                'flex items-center justify-center gap-1 mt-2 text-sm',
                change > 0 && 'text-green-500',
                change < 0 && 'text-red-500',
                change === 0 && 'text-muted-foreground'
              )}
            >
              {change > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : change < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Bar Chart Component
 */
const BarChartRenderer: React.FC<{
  config: Record<string, any>;
  data?: Record<string, any>[];
  height: number;
}> = ({ config, data, height }) => {
  const xKey = config.xAxis || config.dimension || 'name';
  const yKey = config.yAxis || config.metric || 'value';
  const stacked = config.stacked || false;

  // Handle multiple metrics
  const metrics = config.metrics || [yKey];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} className="text-muted-foreground" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {metrics.map((metric: string, index: number) => (
          <Bar
            key={metric}
            dataKey={metric}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Line Chart Component
 */
const LineChartRenderer: React.FC<{
  config: Record<string, any>;
  data?: Record<string, any>[];
  height: number;
}> = ({ config, data, height }) => {
  const xKey = config.xAxis || config.dimension || 'name';
  const metrics = config.metrics || [config.yAxis || config.metric || 'value'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} className="text-muted-foreground" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {metrics.map((metric: string, index: number) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Pie Chart Component
 */
const PieChartRenderer: React.FC<{
  config: Record<string, any>;
  data?: Record<string, any>[];
  height: number;
}> = ({ config, data, height }) => {
  const nameKey = config.nameKey || config.dimension || 'name';
  const valueKey = config.valueKey || config.metric || 'value';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey={valueKey}
          nameKey={nameKey}
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {data?.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Table Component
 */
const TableRenderer: React.FC<{
  config: Record<string, any>;
  data?: Record<string, any>[];
}> = ({ config, data }) => {
  const columns = config.columns || (data?.[0] ? Object.keys(data[0]) : []);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-auto max-h-[400px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            {columns.map((col: string) => (
              <TableHead key={col} className="font-medium">
                {col.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col: string) => (
                <TableCell key={col}>
                  {typeof row[col] === 'number'
                    ? row[col].toLocaleString()
                    : row[col] ?? '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Empty State
 */
const EmptyState: React.FC<{ height: number }> = ({ height }) => (
  <div
    className="flex flex-col items-center justify-center text-center"
    style={{ height }}
  >
    <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">No chart data available</p>
  </div>
);

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  className,
  height = 300,
}) => {
  const { type, config, data } = chart;

  const renderChart = () => {
    switch (type) {
      case 'metric_card':
        return <MetricCard config={config} data={data} />;

      case 'bar':
        return <BarChartRenderer config={config} data={data} height={height} />;

      case 'line':
        return <LineChartRenderer config={config} data={data} height={height} />;

      case 'pie':
        return <PieChartRenderer config={config} data={data} height={height} />;

      case 'table':
        return <TableRenderer config={config} data={data} />;

      default:
        return <EmptyState height={height} />;
    }
  };

  return <div className={cn('w-full', className)}>{renderChart()}</div>;
};

export default ChartRenderer;
