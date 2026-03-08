/**
 * Projects API Endpoints
 *
 * RTK Query endpoints for project operations with automatic caching.
 */

import { api } from "./apiSlice";

// Types
export interface Project {
  project_id: string;
  name: string;
  description: string | null;
  extraction_config?: Record<string, unknown>;
  document_count?: number;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
}

export interface ProjectStatistics {
  project_id: string;
  total_documents: number;
  status_counts: Record<string, number>;
  total_size_bytes: number;
  created_at: string;
}

export interface AggregateProjectStats {
  total_documents: number;
  success_rate: number;
  total_tokens: number;
  estimated_cost: number;
  status_breakdown: {
    completed: number;
    processing: number;
    pending: number;
    failed: number;
  };
  token_by_project: Array<{
    project_id: string;
    project_name: string;
    tokens: number;
  }>;
}

export interface AggregateStatsResponse {
  success: boolean;
  data: AggregateProjectStats;
}

export interface ProjectListResponse {
  success: boolean;
  data: Project[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ProjectResponse {
  success: boolean;
  data: Project;
  message?: string;
}

export interface ProjectStatisticsResponse {
  success: boolean;
  data: ProjectStatistics;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  extraction_config?: Record<string, unknown>;
}

export interface UpdateProjectParams {
  projectId: string;
  name?: string;
  description?: string;
}

export interface ListProjectsParams {
  includeArchived?: boolean;
  page?: number;
  perPage?: number;
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get projects list
    getProjects: builder.query<ProjectListResponse, ListProjectsParams | void>({
      query: (params = {}) => {
        const queryParams: Record<string, unknown> = {
          page: params?.page ?? 1,
          per_page: params?.perPage ?? 20,
        };

        if (params?.includeArchived) {
          queryParams.include_archived = true;
        }

        return {
          url: "/projects/",
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ project_id }) => ({
                type: "Projects" as const,
                id: project_id,
              })),
              { type: "Projects", id: "LIST" },
            ]
          : [{ type: "Projects", id: "LIST" }],
    }),

    // Query: Get single project
    getProject: builder.query<ProjectResponse, string>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: "Projects", id: projectId }],
    }),

    // Query: Get project statistics
    getProjectStatistics: builder.query<ProjectStatisticsResponse, string>({
      query: (projectId) => `/projects/${projectId}/statistics`,
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `${projectId}-stats` },
      ],
    }),

    // Query: Get aggregate statistics across all projects
    getAggregateStats: builder.query<AggregateStatsResponse, void>({
      query: () => "/projects/stats",
      providesTags: [{ type: "Projects", id: "AGGREGATE_STATS" }],
    }),

    // Mutation: Create project
    createProject: builder.mutation<ProjectResponse, CreateProjectParams>({
      query: (body) => ({
        url: "/projects/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Projects", id: "LIST" }],
    }),

    // Mutation: Update project
    updateProject: builder.mutation<ProjectResponse, UpdateProjectParams>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: projectId },
        { type: "Projects", id: "LIST" },
      ],
    }),

    // Mutation: Delete project
    deleteProject: builder.mutation<void, { projectId: string; permanent?: boolean }>({
      query: ({ projectId, permanent = false }) => ({
        url: `/projects/${projectId}`,
        method: "DELETE",
        params: { permanent },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: projectId },
        { type: "Projects", id: "LIST" },
      ],
    }),

    // Mutation: Update extraction config
    updateExtractionConfig: builder.mutation<
      ProjectResponse,
      { projectId: string; extractionConfig: Record<string, unknown> }
    >({
      query: ({ projectId, extractionConfig }) => ({
        url: `/projects/${projectId}/config`,
        method: "PUT",
        body: { config: extractionConfig },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: "Projects", id: projectId }],
    }),

    // Query: Search projects (for CommandPalette global search)
    searchProjects: builder.query<
      {
        success: boolean;
        data: Array<{
          project_id: string;
          name: string;
          description: string | null;
          document_count?: number;
          created_at: string;
        }>;
        total: number;
      },
      { query: string; limit?: number }
    >({
      query: ({ query, limit = 10 }) => ({
        url: "/projects/search",
        params: { q: query, limit },
      }),
      // Don't cache search results for too long
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useGetProjectStatisticsQuery,
  useGetAggregateStatsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useUpdateExtractionConfigMutation,
  useSearchProjectsQuery,
  useLazySearchProjectsQuery,
} = projectsApi;
