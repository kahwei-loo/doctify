/**
 * DashboardPage
 *
 * Main dashboard with unified stats, trends, activity feed, and quick actions.
 * Week 6 Dashboard Optimization
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  FolderKanban,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Database,
  Bot,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAppSelector } from "@/store";
import { selectUser } from "@/store/selectors/authSelectors";
import {
  useGetUnifiedStatsQuery,
  useGetDashboardTrendsQuery,
  useInvalidateDashboardCacheMutation,
} from "@/store/api/dashboardApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Onboarding
import { OnboardingDialog, useOnboarding } from "@/features/onboarding";

// Import new dashboard components
import StatCardWithTrend from "@/features/dashboard/components/StatCardWithTrend";
import ProjectDistributionChart from "@/features/dashboard/components/ProjectDistributionChart";
import RecentActivityList from "@/features/dashboard/components/RecentActivityList";
import WelcomeEmptyState from "@/features/dashboard/components/WelcomeEmptyState";

// Standard stat card for metrics without trends
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={cn("p-3 rounded-lg", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const { showOnboarding, currentStep, nextStep, prevStep, completeOnboarding, skipOnboarding } =
    useOnboarding();

  // Fetch unified stats with 30-second auto-refresh
  const {
    data: statsResponse,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
  } = useGetUnifiedStatsQuery(undefined, {
    pollingInterval: 30000, // 30 seconds auto-refresh
    refetchOnMountOrArgChange: true, // Fresh data when navigating to dashboard
  });

  const { data: trendsResponse, isLoading: isLoadingTrends } = useGetDashboardTrendsQuery({
    days: 30,
  });

  const [invalidateCache, { isLoading: isInvalidating }] = useInvalidateDashboardCacheMutation();

  const stats = statsResponse?.data;
  const trends = trendsResponse?.data;

  // Determine if user is new (no data)
  const isNewUser =
    !isLoadingStats &&
    stats &&
    stats.total_documents === 0 &&
    stats.total_knowledge_bases === 0 &&
    stats.total_assistants === 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleRefresh = async () => {
    await invalidateCache();
  };

  // Format success rate as percentage
  const successRatePercent = stats ? Math.round(stats.success_rate * 100) : 0;

  // Calculate trend data for stat cards
  const documentTrend = stats?.trend_comparison
    ? {
        percent: stats.trend_comparison.documents_change_percent,
        direction: (stats.trend_comparison.documents_change_percent > 0
          ? "up"
          : stats.trend_comparison.documents_change_percent < 0
            ? "down"
            : "neutral") as "up" | "down" | "neutral",
      }
    : undefined;

  const conversationTrend = stats?.trend_comparison
    ? {
        percent: stats.trend_comparison.conversations_change_percent,
        direction: (stats.trend_comparison.conversations_change_percent > 0
          ? "up"
          : stats.trend_comparison.conversations_change_percent < 0
            ? "down"
            : "neutral") as "up" | "down" | "neutral",
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your documents today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isInvalidating || isFetchingStats}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", (isInvalidating || isFetchingStats) && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate("/assistants/new")}>
            <Bot className="mr-2 h-4 w-4" />
            New Assistant
          </Button>
          <Button onClick={() => navigate("/documents")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Show welcome state for new users */}
      {isNewUser && (
        <WelcomeEmptyState
          userName={user?.full_name?.split(" ")[0]}
          hasDocuments={stats.total_documents > 0}
          hasKnowledgeBases={stats.total_knowledge_bases > 0}
          hasAssistants={stats.total_assistants > 0}
        />
      )}

      {/* Primary Stats Grid - Documents & Projects with Trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardWithTrend
          title="Total Documents"
          value={stats?.total_documents || 0}
          icon={FileText}
          description="All documents"
          variant="primary"
          trend={documentTrend}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Projects"
          value={stats?.total_projects || 0}
          icon={FolderKanban}
          description="Active projects"
          variant="default"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Processed"
          value={stats?.processed_documents || 0}
          icon={CheckCircle2}
          description={`${successRatePercent}% success rate`}
          variant="success"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Processing"
          value={stats?.processing_documents || 0}
          icon={Clock}
          description={`${stats?.pending_documents || 0} pending`}
          variant="warning"
          isLoading={isLoadingStats}
        />
      </div>

      {/* KB & Assistant Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Knowledge Bases"
          value={stats?.total_knowledge_bases || 0}
          icon={Database}
          description={`${stats?.total_data_sources || 0} data sources`}
          variant="primary"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="AI Assistants"
          value={stats?.total_assistants || 0}
          icon={Bot}
          description={`${stats?.active_assistants || 0} active`}
          variant="primary"
          isLoading={isLoadingStats}
        />
        <StatCardWithTrend
          title="Conversations"
          value={stats?.total_conversations || 0}
          icon={MessageSquare}
          description={`${stats?.unresolved_conversations || 0} unresolved`}
          variant="default"
          trend={conversationTrend}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Failed Documents"
          value={stats?.failed_documents || 0}
          icon={AlertCircle}
          description="Require attention"
          variant="danger"
          isLoading={isLoadingStats}
        />
      </div>

      {/* Resource Usage Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Total Tokens Used"
          value={stats?.total_tokens_used?.toLocaleString() || "0"}
          icon={TrendingUp}
          description="AI processing tokens"
          variant="default"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Estimated Cost"
          value={`$${stats?.estimated_cost?.toFixed(2) || "0.00"}`}
          icon={DollarSign}
          description="Based on token usage"
          variant="default"
          isLoading={isLoadingStats}
        />
      </div>

      {/* Charts and Activity Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trends Chart - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Processing Trends</CardTitle>
            <CardDescription>
              Document activity over the last {trends?.days || 30} days
              {trendsResponse?.cached && (
                <span className="ml-2 text-xs text-muted-foreground">(cached)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : trends && trends.data.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(label) => formatChartDate(label as string)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="uploaded"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Uploaded"
                    />
                    <Line
                      type="monotone"
                      dataKey="processed"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="Processed"
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Failed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                <p>No trend data available yet</p>
                <p className="text-sm">Start processing documents to see trends</p>
              </div>
            )}
            {trends && trends.data.length > 0 && (
              <div className="flex justify-center gap-8 mt-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{trends.total_uploaded}</p>
                  <p className="text-muted-foreground">Total Uploaded</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{trends.total_processed}</p>
                  <p className="text-muted-foreground">Total Processed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{trends.total_failed}</p>
                  <p className="text-muted-foreground">Total Failed</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Distribution Pie Chart - 1 column */}
        <ProjectDistributionChart />
      </div>

      {/* Recent Activity */}
      <RecentActivityList limit={5} />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/documents")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Upload Document</h3>
                <p className="text-sm text-muted-foreground">Process with AI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/knowledge-base")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Knowledge Base</h3>
                <p className="text-sm text-muted-foreground">Organize documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/assistants")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Bot className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistants</h3>
                <p className="text-sm text-muted-foreground">Build & manage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/chat")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <MessageSquare className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Start Chat</h3>
                <p className="text-sm text-muted-foreground">Query your docs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Onboarding dialog for demo mode */}
      <OnboardingDialog
        open={showOnboarding}
        currentStep={currentStep}
        onNext={nextStep}
        onPrev={prevStep}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    </div>
  );
};

export default DashboardPage;
