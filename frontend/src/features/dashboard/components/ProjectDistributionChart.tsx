/**
 * ProjectDistributionChart Component
 *
 * Pie chart showing document distribution across projects.
 * Uses existing useGetProjectDistributionQuery hook.
 * Week 6 Dashboard Optimization
 */

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FolderKanban, Loader2 } from "lucide-react";
import { useGetProjectDistributionQuery } from "@/store/api/dashboardApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Color palette for pie chart segments
const COLORS = [
  "hsl(var(--primary))",
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface ProjectDistributionChartProps {
  className?: string;
}

const ProjectDistributionChart: React.FC<ProjectDistributionChartProps> = ({ className }) => {
  const { data: response, isLoading, error } = useGetProjectDistributionQuery();

  const distribution = response?.data || [];

  // Transform data for pie chart
  const chartData = distribution.map((item, index) => ({
    name: item.project_name,
    value: item.document_count,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: (typeof chartData)[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value} documents ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    );
  };

  const renderLegend = () => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {chartData.slice(0, 5).map((entry, _index) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {entry.name}
            </span>
          </div>
        ))}
        {chartData.length > 5 && (
          <span className="text-xs text-muted-foreground">+{chartData.length - 5} more</span>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Project Distribution
        </CardTitle>
        <CardDescription>How documents are distributed across your projects</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <p>Failed to load distribution data</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm">Create a project to see distribution</p>
          </div>
        ) : (
          <>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {renderLegend()}
            <div className="text-center mt-3">
              <p className="text-2xl font-bold">
                {distribution.reduce((sum, item) => sum + item.document_count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectDistributionChart;
