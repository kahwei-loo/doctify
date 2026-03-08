/**
 * Mock API handler for demo mode
 * Matches API endpoint URLs and returns corresponding mock data
 */

import {
  DEMO_USER,
  DEMO_AUTH_RESPONSE,
  DEMO_DASHBOARD_STATS,
  DEMO_DASHBOARD_TRENDS,
  DEMO_RECENT_ACTIVITY,
  DEMO_DOCUMENTS,
  DEMO_DOCUMENTS_STATS,
  DEMO_PROJECTS,
  DEMO_PROJECTS_STATS,
  DEMO_ASSISTANTS,
  DEMO_ASSISTANT_CONVERSATIONS,
  DEMO_RAG_QUERIES,
  DEMO_KNOWLEDGE_BASES,
  // Chat
  DEMO_CHAT_CONVERSATIONS,
  DEMO_CHAT_MESSAGES,
  DEMO_CHAT_STATS,
  // Insights
  DEMO_DATASETS,
  DEMO_PRESET_QUERIES,
  DEMO_QUERY_RESULTS,
  // Templates
  DEMO_TEMPLATES,
  DEMO_TEMPLATES_STATS,
  // Settings
  DEMO_USER_PROFILE,
  DEMO_NOTIFICATION_SETTINGS,
  DEMO_API_KEYS,
  DEMO_BILLING_INFO,
  DEMO_SECURITY_SETTINGS,
  DEMO_ALL_SETTINGS,
  DEMO_AI_MODEL_SETTINGS,
  DEMO_MODEL_CATALOG,
  // RAG
  DEMO_RAG_RESPONSES,
  // Unified Query
  matchUnifiedQueryMock,
} from "../mockData";

// Simulate network delay for realism
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Random delay between 500-1500ms
const randomDelay = () => delay(500 + Math.random() * 1000);

interface MockApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    status: number;
  };
}

// Helper to wrap response in standard API format
const wrapResponse = <T>(data: T) => ({
  success: true,
  data,
  cached: false,
  cache_ttl: null,
});

/**
 * Mock API handler - matches endpoint and returns mock data
 */
export const mockApiHandler = async (endpoint: string, args?: any): Promise<MockApiResponse> => {
  console.log("[Demo API] Handling request:", endpoint, args);

  // Add realistic delay
  await randomDelay();

  // Parse URL to extract path and query params
  const url = new URL(endpoint, "http://localhost");
  const path = url.pathname;

  // Auth endpoints
  if (path === "/api/v1/auth/me" || path.endsWith("/auth/me")) {
    return {
      data: {
        success: true,
        data: DEMO_USER,
      },
    };
  }

  if (path === "/api/v1/auth/login" || path.endsWith("/auth/login")) {
    return {
      data: {
        success: true,
        data: DEMO_AUTH_RESPONSE,
      },
    };
  }

  // Dashboard endpoints
  if (path === "/api/v1/dashboard/stats" || path.endsWith("/dashboard/stats")) {
    return { data: wrapResponse(DEMO_DASHBOARD_STATS) };
  }

  // Unified stats endpoint (Week 6 optimization)
  if (path === "/api/v1/dashboard/unified-stats" || path.endsWith("/dashboard/unified-stats")) {
    const unifiedStats = {
      ...DEMO_DASHBOARD_STATS,
      // Knowledge Base stats
      total_knowledge_bases: 2,
      total_data_sources: 5,
      total_embeddings: 15000,
      // Assistant stats
      total_assistants: 2,
      active_assistants: 2,
      total_conversations: 12,
      unresolved_conversations: 3,
      // Trend comparison
      trend_comparison: {
        documents_this_week: 15,
        documents_last_week: 12,
        documents_change_percent: 25.0,
        conversations_this_week: 8,
        conversations_last_week: 6,
        conversations_change_percent: 33.3,
      },
    };
    return { data: wrapResponse(unifiedStats) };
  }

  if (path === "/api/v1/dashboard/trends" || path.endsWith("/dashboard/trends")) {
    return {
      data: {
        success: true,
        data: {
          days: 30,
          data: DEMO_DASHBOARD_TRENDS,
          total_uploaded: 47,
          total_processed: 33,
          total_failed: 3,
        },
        cached: false,
      },
    };
  }

  if (
    path === "/api/v1/dashboard/activity" ||
    path.endsWith("/dashboard/activity") ||
    path === "/api/v1/dashboard/recent-activity" ||
    path.endsWith("/dashboard/recent-activity")
  ) {
    return {
      data: {
        success: true,
        data: DEMO_RECENT_ACTIVITY,
      },
    };
  }

  // Project distribution endpoint
  if (path === "/api/v1/dashboard/distribution" || path.endsWith("/dashboard/distribution")) {
    return {
      data: {
        success: true,
        data: [
          {
            project_id: "proj-001",
            project_name: "Q1 2024 Invoices",
            document_count: 15,
            percentage: 31.9,
          },
          {
            project_id: "proj-002",
            project_name: "Expense Receipts",
            document_count: 12,
            percentage: 25.5,
          },
          {
            project_id: "proj-003",
            project_name: "Legal Contracts",
            document_count: 8,
            percentage: 17.0,
          },
          {
            project_id: null,
            project_name: "Unassigned",
            document_count: 12,
            percentage: 25.5,
          },
        ],
      },
    };
  }

  // Documents endpoints
  if (path === "/api/v1/documents" || path.endsWith("/documents")) {
    // Handle query parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "20");
    const projectId = url.searchParams.get("project_id");

    let filteredDocs = [...DEMO_DOCUMENTS];

    // Filter by project if specified
    if (projectId) {
      filteredDocs = filteredDocs.filter((doc) => doc.project_id === projectId);
    }

    // Pagination
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedDocs = filteredDocs.slice(start, end);

    return {
      data: {
        success: true,
        data: paginatedDocs,
        pagination: {
          total: filteredDocs.length,
          page,
          per_page: perPage,
          total_pages: Math.ceil(filteredDocs.length / perPage),
        },
      },
    };
  }

  // Document detail endpoint
  if (path.match(/\/api\/v1\/documents\/[\w-]+$/) || path.match(/\/documents\/[\w-]+$/)) {
    const docId = path.split("/").pop();
    const document = DEMO_DOCUMENTS.find((doc) => doc.document_id === docId);

    if (document) {
      return {
        data: {
          success: true,
          data: document,
        },
      };
    } else {
      return {
        error: {
          message: "Document not found",
          status: 404,
        },
      };
    }
  }

  // Documents stats endpoint
  if (path === "/api/v1/documents/stats" || path.endsWith("/documents/stats")) {
    return {
      data: {
        success: true,
        data: DEMO_DOCUMENTS_STATS,
      },
    };
  }

  // Projects endpoints
  if (
    path === "/api/v1/projects" ||
    path === "/api/v1/projects/" ||
    path.endsWith("/projects") ||
    path.endsWith("/projects/")
  ) {
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "20");

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedProjects = DEMO_PROJECTS.slice(start, end);

    return {
      data: {
        success: true,
        data: paginatedProjects,
        pagination: {
          total: DEMO_PROJECTS.length,
          page,
          per_page: perPage,
          total_pages: Math.ceil(DEMO_PROJECTS.length / perPage),
          has_next: end < DEMO_PROJECTS.length,
          has_prev: page > 1,
        },
      },
    };
  }

  // Project detail endpoint
  if (path.match(/\/api\/v1\/projects\/[\w-]+$/) || path.match(/\/projects\/[\w-]+$/)) {
    const projectId = path.split("/").pop();
    const project = DEMO_PROJECTS.find((proj) => proj.project_id === projectId);

    if (project) {
      return {
        data: {
          success: true,
          data: project,
        },
      };
    } else {
      return {
        error: {
          message: "Project not found",
          status: 404,
        },
      };
    }
  }

  // Projects stats endpoint
  if (path === "/api/v1/projects/stats" || path.endsWith("/projects/stats")) {
    return {
      data: {
        success: true,
        data: DEMO_PROJECTS_STATS,
      },
    };
  }

  // Assistants endpoints
  if (
    path === "/api/v1/assistants/" ||
    path === "/api/v1/assistants" ||
    path.endsWith("/assistants/") ||
    path.endsWith("/assistants")
  ) {
    return {
      data: {
        success: true,
        data: {
          assistants: DEMO_ASSISTANTS,
          total: DEMO_ASSISTANTS.length,
        },
      },
    };
  }

  // Single assistant endpoint
  if (path.match(/\/api\/v1\/assistants\/[\w-]+$/) || path.match(/\/assistants\/[\w-]+$/)) {
    const assistantId = path.split("/").pop();
    const assistant = DEMO_ASSISTANTS.find((a) => a.id === assistantId);
    if (assistant) {
      return {
        data: {
          success: true,
          data: assistant,
        },
      };
    }
  }

  // Assistant conversations endpoint
  if (
    path.match(/\/api\/v1\/assistants\/[\w-]+\/conversations$/) ||
    path.match(/\/assistants\/[\w-]+\/conversations$/)
  ) {
    const pathParts = path.split("/");
    const assistantId = pathParts[pathParts.length - 2];
    const rawConversations =
      DEMO_ASSISTANT_CONVERSATIONS[assistantId as keyof typeof DEMO_ASSISTANT_CONVERSATIONS] || [];

    // Transform to match BackendConversationResponse shape expected by transformResponse
    const conversations = rawConversations.map((conv: any) => ({
      id: conv.conversation_id,
      assistant_id: conv.assistant_id,
      user_id: null,
      session_id: null,
      status: conv.status,
      last_message_preview: conv.title || "",
      last_message_at: conv.created_at,
      message_count: conv.message_count || 0,
      context: {},
      resolved_at: conv.status === "resolved" ? conv.created_at : null,
      created_at: conv.created_at,
      updated_at: conv.created_at,
    }));

    return {
      data: {
        success: true,
        data: {
          conversations,
          total: conversations.length,
        },
      },
    };
  }

  // Assistant stats endpoint
  if (path === "/api/v1/assistants/stats" || path.endsWith("/assistants/stats")) {
    return {
      data: {
        success: true,
        data: {
          total_assistants: DEMO_ASSISTANTS.length,
          active_assistants: DEMO_ASSISTANTS.filter((a) => a.is_active).length,
          total_conversations: DEMO_ASSISTANTS.reduce((sum, a) => sum + a.total_conversations, 0),
          unresolved_conversations: DEMO_ASSISTANTS.reduce((sum, a) => sum + a.unresolved_count, 0),
        },
      },
    };
  }

  // RAG/Knowledge Base endpoints
  if (path === "/api/v1/rag/stats" || path.endsWith("/rag/stats")) {
    return {
      data: {
        success: true,
        data: {
          total_queries: 150,
          total_documents_indexed: 47,
          total_chunks: 823,
          average_confidence: 0.87,
          average_rating: 4.2,
          queries_with_feedback: 45,
        },
      },
    };
  }

  // RAG query history
  if (path.includes("/rag/history")) {
    return {
      data: {
        success: true,
        data: {
          items: DEMO_RAG_QUERIES.slice(0, 10),
          total: DEMO_RAG_QUERIES.length,
          limit: 50,
          offset: 0,
        },
      },
    };
  }

  // Unified query endpoint (RAG + Analytics)
  if (path.includes("/unified-query")) {
    const body = args?.body;
    const queryText = body?.query || "What are the payment terms?";
    const mockResponse = matchUnifiedQueryMock(queryText);
    return { data: mockResponse };
  }

  // Unified query feedback
  if (path.match(/\/rag\/queries\/[\w-]+\/feedback$/)) {
    return { data: { success: true } };
  }

  // Knowledge bases endpoint
  if (path.includes("/knowledge-bases") || path.includes("/kb")) {
    return {
      data: {
        success: true,
        data: {
          knowledge_bases: DEMO_KNOWLEDGE_BASES,
          total: DEMO_KNOWLEDGE_BASES.length,
        },
      },
    };
  }

  // ===== CHAT ENDPOINTS =====

  // Chat conversations list
  // NOTE: Chat RTK Query endpoints expect raw data (no {success, data} wrapper)
  if (path === "/api/v1/chat/conversations" || path.endsWith("/chat/conversations")) {
    const limit = parseInt(url.searchParams.get("limit") || "50");
    return {
      data: DEMO_CHAT_CONVERSATIONS.slice(0, limit),
    };
  }

  // Chat conversation messages
  if (path.match(/\/chat\/conversations\/[\w-]+\/messages$/)) {
    const pathParts = path.split("/");
    const conversationId = pathParts[pathParts.length - 2];
    const messages = DEMO_CHAT_MESSAGES[conversationId as keyof typeof DEMO_CHAT_MESSAGES] || [];

    return {
      data: messages,
    };
  }

  // Chat stats
  if (path === "/api/v1/chat/stats" || path.endsWith("/chat/stats")) {
    return {
      data: DEMO_CHAT_STATS,
    };
  }

  // Single chat conversation
  if (path.match(/\/chat\/conversations\/[\w-]+$/)) {
    const conversationId = path.split("/").pop();
    const conversation = DEMO_CHAT_CONVERSATIONS.find((c) => c.id === conversationId);

    if (conversation) {
      return {
        data: conversation,
      };
    }
  }

  // ===== INSIGHTS/DATASETS ENDPOINTS =====

  // Insights conversations (used by InsightsPage)
  if (path === "/api/v1/insights/conversations" || path.endsWith("/insights/conversations")) {
    // Return datasets as "conversations" for the insights page
    return {
      data: {
        success: true,
        data: {
          conversations: DEMO_DATASETS.map((d) => ({
            id: d.dataset_id,
            name: d.name,
            description: d.description,
            document_count: d.document_count,
            created_at: d.created_at,
            updated_at: d.updated_at,
            status: d.status,
          })),
          total: DEMO_DATASETS.length,
        },
      },
    };
  }

  // Single insights conversation/dataset
  if (path.match(/\/insights\/conversations\/[\w-]+$/)) {
    const datasetId = path.split("/").pop();
    const dataset = DEMO_DATASETS.find((d) => d.dataset_id === datasetId);

    if (dataset) {
      return {
        data: {
          success: true,
          data: {
            id: dataset.dataset_id,
            name: dataset.name,
            description: dataset.description,
            document_count: dataset.document_count,
            created_at: dataset.created_at,
            updated_at: dataset.updated_at,
            status: dataset.status,
            preset_queries: DEMO_PRESET_QUERIES.filter((q) => q.dataset_id === datasetId),
          },
        },
      };
    }
  }

  // Insights query endpoint
  if (path.match(/\/insights\/conversations\/[\w-]+\/query$/)) {
    const pathParts = path.split("/");
    const conversationId = pathParts[pathParts.length - 2];

    // Find a matching preset query or return a generic response
    const presetQuery = DEMO_PRESET_QUERIES.find((q) => q.dataset_id === conversationId);
    const queryResult = presetQuery
      ? DEMO_QUERY_RESULTS[presetQuery.query_id as keyof typeof DEMO_QUERY_RESULTS]
      : {
          success: true,
          answer: "Based on the analyzed documents, the query has been processed successfully.",
          chart_data: null,
          sources: [],
        };

    return {
      data: {
        success: true,
        data: queryResult,
      },
    };
  }

  // Insights history endpoint
  if (path.match(/\/insights\/conversations\/[\w-]+\/history$/)) {
    return {
      data: {
        success: true,
        data: {
          history: DEMO_PRESET_QUERIES.slice(0, 5).map((q, i) => ({
            id: `history-${i}`,
            query: q.question,
            timestamp: new Date(Date.now() - i * 3600000).toISOString(),
            success: true,
          })),
          total: 5,
        },
      },
    };
  }

  // Datasets endpoint
  if (path === "/api/v1/datasets" || path.endsWith("/datasets")) {
    return {
      data: {
        success: true,
        data: {
          datasets: DEMO_DATASETS,
          total: DEMO_DATASETS.length,
        },
      },
    };
  }

  // ===== TEMPLATES ENDPOINTS =====

  // Templates list
  if (
    path === "/api/v1/templates" ||
    path === "/api/v1/templates/" ||
    path.endsWith("/templates") ||
    path.endsWith("/templates/")
  ) {
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "20");
    const activeOnly = url.searchParams.get("active") === "true";

    let filteredTemplates = [...DEMO_TEMPLATES];
    if (activeOnly) {
      filteredTemplates = filteredTemplates.filter((t) => t.is_active);
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedTemplates = filteredTemplates.slice(start, end);

    return {
      data: {
        success: true,
        data: paginatedTemplates,
        pagination: {
          total: filteredTemplates.length,
          page,
          per_page: perPage,
          total_pages: Math.ceil(filteredTemplates.length / perPage),
        },
      },
    };
  }

  // Single template
  if (path.match(/\/templates\/[\w-]+$/)) {
    const templateId = path.split("/").pop();
    const template = DEMO_TEMPLATES.find((t) => t.template_id === templateId);

    if (template) {
      return {
        data: {
          success: true,
          data: template,
        },
      };
    } else {
      return {
        error: {
          message: "Template not found",
          status: 404,
        },
      };
    }
  }

  // Templates stats
  if (path === "/api/v1/templates/stats" || path.endsWith("/templates/stats")) {
    return {
      data: {
        success: true,
        data: DEMO_TEMPLATES_STATS,
      },
    };
  }

  // ===== SETTINGS ENDPOINTS =====

  // User profile
  if (
    path === "/api/v1/settings/profile" ||
    path.endsWith("/settings/profile") ||
    path === "/api/v1/users/me" ||
    path.endsWith("/users/me")
  ) {
    return {
      data: {
        success: true,
        data: DEMO_USER_PROFILE,
      },
    };
  }

  // Notification settings
  if (path === "/api/v1/settings/notifications" || path.endsWith("/settings/notifications")) {
    return {
      data: {
        success: true,
        data: DEMO_NOTIFICATION_SETTINGS,
      },
    };
  }

  // API keys
  if (
    path === "/api/v1/settings/api-keys" ||
    path.endsWith("/settings/api-keys") ||
    path === "/api/v1/api-keys" ||
    path.endsWith("/api-keys")
  ) {
    return {
      data: {
        success: true,
        data: {
          api_keys: DEMO_API_KEYS,
          total: DEMO_API_KEYS.length,
        },
      },
    };
  }

  // Billing info
  if (
    path === "/api/v1/settings/billing" ||
    path.endsWith("/settings/billing") ||
    path === "/api/v1/billing" ||
    path.endsWith("/billing")
  ) {
    return {
      data: {
        success: true,
        data: DEMO_BILLING_INFO,
      },
    };
  }

  // Security settings
  if (path === "/api/v1/settings/security" || path.endsWith("/settings/security")) {
    return {
      data: {
        success: true,
        data: DEMO_SECURITY_SETTINGS,
      },
    };
  }

  // All settings (combined)
  if (path === "/api/v1/settings" || path.endsWith("/settings")) {
    return {
      data: {
        success: true,
        data: DEMO_ALL_SETTINGS,
      },
    };
  }

  // ===== ASSISTANT CONVERSATION MESSAGES ENDPOINT =====

  // Assistant conversation messages (different from assistant's conversations list)
  if (path.match(/\/assistants\/conversations\/[\w-]+\/messages$/)) {
    const pathParts = path.split("/");
    const conversationId = pathParts[pathParts.length - 2];

    // Generate some mock messages for any conversation
    const mockMessages = [
      {
        message_id: `msg-${conversationId}-1`,
        conversation_id: conversationId,
        role: "user",
        content: "Hello, I need help with document processing.",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        message_id: `msg-${conversationId}-2`,
        conversation_id: conversationId,
        role: "assistant",
        content:
          "Hello! I'd be happy to help you with document processing. What type of documents would you like to process?",
        created_at: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        message_id: `msg-${conversationId}-3`,
        conversation_id: conversationId,
        role: "user",
        content: "I have some invoices that need to be extracted.",
        created_at: new Date(Date.now() - 3400000).toISOString(),
      },
      {
        message_id: `msg-${conversationId}-4`,
        conversation_id: conversationId,
        role: "assistant",
        content:
          "I can help you extract data from invoices. You can upload your invoice documents, and I'll automatically extract key fields like invoice number, date, vendor name, line items, and total amount. Would you like me to guide you through the upload process?",
        created_at: new Date(Date.now() - 3300000).toISOString(),
      },
    ];

    return {
      data: {
        success: true,
        data: {
          messages: mockMessages,
          total: mockMessages.length,
        },
      },
    };
  }

  // Assistant conversation status
  if (path.match(/\/assistants\/conversations\/[\w-]+\/status$/)) {
    return {
      data: {
        success: true,
        data: {
          status: "in_progress",
          last_message_at: new Date().toISOString(),
        },
      },
    };
  }

  // ===== ADMIN: AI MODEL SETTINGS =====

  // GET /admin/ai-models — full settings response
  if (path === "/api/v1/admin/ai-models" || path.endsWith("/admin/ai-models")) {
    return {
      data: {
        success: true,
        data: DEMO_AI_MODEL_SETTINGS,
      },
    };
  }

  // GET /admin/ai-models/catalog — model catalog list
  if (path === "/api/v1/admin/ai-models/catalog" || path.endsWith("/admin/ai-models/catalog")) {
    return {
      data: {
        success: true,
        data: DEMO_MODEL_CATALOG,
      },
    };
  }

  // PATCH /admin/ai-models/:purpose — update a model setting (read-only in demo)
  if (path.match(/\/admin\/ai-models\/[\w-]+$/) && !path.endsWith("/catalog")) {
    return { data: { success: true, data: DEMO_AI_MODEL_SETTINGS } };
  }

  // POST/PATCH/DELETE /admin/ai-models/catalog/:id — catalog mutations (read-only in demo)
  if (path.match(/\/admin\/ai-models\/catalog\/[\w-]+$/)) {
    return { data: { success: true } };
  }

  // ===== RAG: DIRECT QUERY & CONVERSATIONS =====

  // POST /rag/query — direct RAG question
  if (path === "/api/v1/rag/query" || path.endsWith("/rag/query")) {
    const queryText: string = args?.body?.query || "What is the vacation policy?";
    const matchedKey = Object.keys(DEMO_RAG_RESPONSES).find((k) =>
      DEMO_RAG_QUERIES.find((q) => q.query_id === k)
        ?.question.toLowerCase()
        .includes(queryText.toLowerCase().split(" ")[0])
    );
    const response = matchedKey
      ? DEMO_RAG_RESPONSES[matchedKey as keyof typeof DEMO_RAG_RESPONSES]
      : DEMO_RAG_RESPONSES["rag-query-001"];
    return {
      data: {
        success: true,
        data: {
          query_id: `rag-query-${Date.now()}`,
          question: queryText,
          ...response,
        },
      },
    };
  }

  // GET /rag/conversations — conversation list
  if (
    (path === "/api/v1/rag/conversations" || path.endsWith("/rag/conversations")) &&
    args?.method !== "POST"
  ) {
    const limit = parseInt(url.searchParams.get("limit") || "50");
    return {
      data: {
        success: true,
        data: {
          items: DEMO_RAG_QUERIES.slice(0, limit).map((q) => ({
            conversation_id: q.query_id,
            title: q.question,
            kb_id: q.kb_id,
            created_at: q.created_at,
            message_count: 2,
          })),
          total: DEMO_RAG_QUERIES.length,
        },
      },
    };
  }

  // POST /rag/conversations — create conversation (demo: return stub)
  if (
    (path === "/api/v1/rag/conversations" || path.endsWith("/rag/conversations")) &&
    args?.method === "POST"
  ) {
    return {
      data: {
        success: true,
        data: {
          conversation_id: `rag-conv-${Date.now()}`,
          title: "New Conversation",
          created_at: new Date().toISOString(),
        },
      },
    };
  }

  // GET /rag/evaluations — evaluation list (empty in demo)
  if (path.includes("/rag/evaluations")) {
    return {
      data: {
        success: true,
        data: { items: [], total: 0 },
      },
    };
  }

  // GET /rag/feedback/:id
  if (path.match(/\/rag\/feedback\/[\w-]+$/)) {
    return { data: { success: true } };
  }

  // ===== SEARCH ENDPOINTS =====

  // GET /documents/search
  if (path === "/api/v1/documents/search" || path.endsWith("/documents/search")) {
    const q = url.searchParams.get("q") || "";
    const filtered = DEMO_DOCUMENTS.filter(
      (d) =>
        !q ||
        d.filename.toLowerCase().includes(q.toLowerCase()) ||
        (d.mime_type || "").toLowerCase().includes(q.toLowerCase())
    );
    return {
      data: {
        success: true,
        data: { items: filtered.slice(0, 20), total: filtered.length },
      },
    };
  }

  // GET /projects/search
  if (path === "/api/v1/projects/search" || path.endsWith("/projects/search")) {
    const q = url.searchParams.get("q") || "";
    const filtered = DEMO_PROJECTS.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(q.toLowerCase())
    );
    return {
      data: {
        success: true,
        data: { items: filtered.slice(0, 20), total: filtered.length },
      },
    };
  }

  // ===== MISC ENDPOINTS =====

  // GET /dashboard/recent (alias for recent-activity)
  if (path === "/api/v1/dashboard/recent" || path.endsWith("/dashboard/recent")) {
    return {
      data: {
        success: true,
        data: { items: DEMO_RECENT_ACTIVITY.slice(0, 10), total: DEMO_RECENT_ACTIVITY.length },
      },
    };
  }

  // POST /auth/change-password (demo: always succeed)
  if (path === "/api/v1/auth/change-password" || path.endsWith("/auth/change-password")) {
    return { data: { success: true, message: "Password updated successfully" } };
  }

  // GET /auth/api-keys (RTK Query path via authApi)
  if (path === "/api/v1/auth/api-keys" || path.endsWith("/auth/api-keys")) {
    return {
      data: {
        success: true,
        data: DEMO_API_KEYS,
      },
    };
  }

  // Edit history — return empty (feature not demoed)
  if (path.includes("/edit-history")) {
    return {
      data: {
        success: true,
        data: { items: [], total: 0 },
      },
    };
  }

  // POST mutations that are no-ops in demo (delete, cancel, retry, etc.)
  if (
    args?.method === "DELETE" ||
    path.includes("/cancel") ||
    path.includes("/retry") ||
    path.includes("/confirm") ||
    path.includes("/validate-quality") ||
    path.includes("/process") ||
    path.includes("/export") ||
    path.includes("/invalidate-cache") ||
    path.includes("/logout")
  ) {
    return { data: { success: true } };
  }

  // Default: endpoint not found
  console.warn("[Demo API] No mock handler for endpoint:", endpoint);
  return {
    error: {
      message: `No mock data for endpoint: ${path}`,
      status: 404,
    },
  };
};
