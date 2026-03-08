/**
 * Templates API Endpoints
 *
 * RTK Query endpoints for template management.
 */

import { api } from "./apiSlice";

// Field definition for extraction config
export interface FieldDefinition {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default_value?: unknown;
}

// Table column definition
export interface TableColumnDefinition {
  name: string;
  type: string;
  description?: string;
}

// Table definition for extraction config
export interface TableDefinition {
  name: string;
  columns: TableColumnDefinition[];
  description?: string;
}

// Extraction configuration
export interface ExtractionConfig {
  fields: FieldDefinition[];
  tables: TableDefinition[];
  instructions?: string;
}

// Full template response
export interface Template {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  visibility: "private" | "public" | "organization";
  document_type: string | null;
  extraction_config: ExtractionConfig;
  category: string | null;
  tags: string[] | null;
  version: number;
  usage_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

// Simplified template for list views
export interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  document_type: string | null;
  visibility: "private" | "public" | "organization";
  category: string | null;
  tags: string[] | null;
  usage_count: number;
  average_rating: number;
  created_at: string;
}

// Create template request
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  document_type?: string;
  visibility?: "private" | "public" | "organization";
  extraction_config?: ExtractionConfig;
  category?: string;
  tags?: string[];
}

// Update template request (partial)
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  document_type?: string;
  visibility?: "private" | "public" | "organization";
  extraction_config?: ExtractionConfig;
  category?: string;
  tags?: string[];
}

// List templates params
export interface ListTemplatesParams {
  visibility?: "all" | "mine" | "public";
  category?: string;
  document_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// API responses
export interface TemplateResponse {
  success: boolean;
  data: Template;
}

export interface TemplateListResponse {
  success: boolean;
  data: TemplateListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApplyTemplateResponse {
  success: boolean;
  message: string;
  project_id: string;
  template_id: string;
}

// Valid values
export const VALID_VISIBILITIES = ["private", "public", "organization"] as const;
export const VALID_DOCUMENT_TYPES = [
  "invoice",
  "receipt",
  "contract",
  "form",
  "report",
  "custom",
] as const;
export const VALID_FIELD_TYPES = ["string", "number", "date", "boolean", "array"] as const;

export const templatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: List templates
    getTemplates: builder.query<TemplateListResponse, ListTemplatesParams | void>({
      query: (params) => ({
        url: "/templates",
        params: params || {},
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Templates" as const, id })),
              { type: "Templates", id: "LIST" },
            ]
          : [{ type: "Templates", id: "LIST" }],
    }),

    // Query: Get single template
    getTemplate: builder.query<TemplateResponse, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Templates", id }],
    }),

    // Mutation: Create template
    createTemplate: builder.mutation<TemplateResponse, CreateTemplateRequest>({
      query: (body) => ({
        url: "/templates",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Templates", id: "LIST" }],
    }),

    // Mutation: Update template
    updateTemplate: builder.mutation<
      TemplateResponse,
      { id: string; updates: UpdateTemplateRequest }
    >({
      query: ({ id, updates }) => ({
        url: `/templates/${id}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Templates", id },
        { type: "Templates", id: "LIST" },
      ],
    }),

    // Mutation: Delete template
    deleteTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Templates", id },
        { type: "Templates", id: "LIST" },
      ],
    }),

    // Mutation: Apply template to project
    applyTemplate: builder.mutation<
      ApplyTemplateResponse,
      { templateId: string; projectId: string }
    >({
      query: ({ templateId, projectId }) => ({
        url: `/templates/${templateId}/apply`,
        method: "POST",
        body: { project_id: projectId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: "Projects", id: projectId }],
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useApplyTemplateMutation,
} = templatesApi;
