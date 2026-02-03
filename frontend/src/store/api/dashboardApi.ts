/**
 * Dashboard API Endpoints
 *
 * RTK Query endpoints for dashboard statistics and analytics.
 */

import { api } from './apiSlice';

// Types for dashboard data
export interface DashboardStats {
  total_projects: number;
  total_documents: number;
  processed_documents: number;
  pending_documents: number;
  processing_documents: number;
  failed_documents: number;
  success_rate: number;
  total_tokens_used: number;
  estimated_cost: number;
}

export interface TrendDataPoint {
  date: string;
  uploaded: number;
  processed: number;
  failed: number;
}

export interface TrendData {
  days: number;
  data: TrendDataPoint[];
  total_uploaded: number;
  total_processed: number;
  total_failed: number;
}

export interface ProjectDistribution {
  project_id: string;
  project_name: string;
  document_count: number;
  percentage: number;
}

export interface RecentDocument {
  document_id: string;
  filename: string;
  status: string;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  processed_at: string | null;
}

// Week 6 Optimization: Unified stats with KB, Assistant, and trend data
export interface TrendComparison {
  documents_this_week: number;
  documents_last_week: number;
  documents_change_percent: number;
  conversations_this_week: number;
  conversations_last_week: number;
  conversations_change_percent: number;
}

export interface UnifiedStats extends DashboardStats {
  // Knowledge Base stats
  total_knowledge_bases: number;
  total_data_sources: number;
  total_embeddings: number;
  // Assistant stats
  total_assistants: number;
  active_assistants: number;
  total_conversations: number;
  unresolved_conversations: number;
  // Trend comparison
  trend_comparison: TrendComparison | null;
}

export interface RecentActivity {
  activity_id: string;
  activity_type: 'document' | 'conversation';
  title: string;
  subtitle: string | null;
  status: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// Response wrappers
export interface StatsResponse {
  success: boolean;
  data: DashboardStats;
  cached: boolean;
  cache_ttl: number | null;
}

export interface TrendsResponse {
  success: boolean;
  data: TrendData;
  cached: boolean;
}

export interface RecentDocumentsResponse {
  success: boolean;
  data: RecentDocument[];
}

export interface DistributionResponse {
  success: boolean;
  data: ProjectDistribution[];
}

export interface UnifiedStatsResponse {
  success: boolean;
  data: UnifiedStats;
  cached: boolean;
  cache_ttl: number | null;
}

export interface RecentActivityResponse {
  success: boolean;
  data: RecentActivity[];
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get dashboard statistics
    getDashboardStats: builder.query<StatsResponse, { noCache?: boolean } | void>({
      query: (params) => ({
        url: '/dashboard/stats',
        params: params && params.noCache ? { no_cache: true } : undefined,
      }),
      providesTags: ['Dashboard'],
      // Keep data fresh for 5 minutes (matches backend cache TTL)
      keepUnusedDataFor: 300,
    }),

    // Query: Get trends data
    getDashboardTrends: builder.query<TrendsResponse, { days?: number; noCache?: boolean }>({
      query: ({ days = 30, noCache = false }) => ({
        url: '/dashboard/trends',
        params: {
          days,
          ...(noCache ? { no_cache: true } : {}),
        },
      }),
      providesTags: ['Dashboard'],
      // Keep data fresh for 10 minutes (matches backend cache TTL)
      keepUnusedDataFor: 600,
    }),

    // Query: Get recent documents
    getRecentDocuments: builder.query<RecentDocumentsResponse, { limit?: number }>({
      query: ({ limit = 5 }) => ({
        url: '/dashboard/recent',
        params: { limit },
      }),
      providesTags: ['Dashboard', 'Documents'],
    }),

    // Query: Get project distribution
    getProjectDistribution: builder.query<DistributionResponse, void>({
      query: () => '/dashboard/distribution',
      providesTags: ['Dashboard', 'Projects'],
    }),

    // Mutation: Invalidate dashboard cache
    invalidateDashboardCache: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/dashboard/invalidate-cache',
        method: 'POST',
      }),
      invalidatesTags: ['Dashboard'],
    }),

    // Week 6 Optimization: Unified stats endpoint
    getUnifiedStats: builder.query<UnifiedStatsResponse, { noCache?: boolean } | void>({
      query: (params) => ({
        url: '/dashboard/unified-stats',
        params: params && params.noCache ? { no_cache: true } : undefined,
      }),
      providesTags: ['Dashboard'],
      // Keep data fresh for 5 minutes (matches backend cache TTL)
      keepUnusedDataFor: 300,
    }),

    // Week 6 Optimization: Recent activity endpoint
    getRecentActivity: builder.query<RecentActivityResponse, { limit?: number }>({
      query: ({ limit = 5 }) => ({
        url: '/dashboard/recent-activity',
        params: { limit },
      }),
      providesTags: ['Dashboard', 'Documents'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetDashboardTrendsQuery,
  useGetRecentDocumentsQuery,
  useGetProjectDistributionQuery,
  useInvalidateDashboardCacheMutation,
  // Week 6 Optimization
  useGetUnifiedStatsQuery,
  useGetRecentActivityQuery,
} = dashboardApi;
