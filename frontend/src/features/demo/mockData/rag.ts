/**
 * Mock RAG and Knowledge Base data for demo mode
 */

export const DEMO_KNOWLEDGE_BASES = [
  {
    kb_id: "kb-001",
    name: "Company Policies",
    description: "Employee handbook and company policies",
    document_count: 12,
    embedding_count: 2340,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    status: "ready",
    vectorstore_id: "vs-001",
  },
  {
    kb_id: "kb-002",
    name: "Technical Documentation",
    description: "API docs, integration guides, and technical references",
    document_count: 8,
    embedding_count: 1850,
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-02-01T14:20:00Z",
    status: "ready",
    vectorstore_id: "vs-002",
  },
];

export const DEMO_RAG_QUERIES = [
  {
    query_id: "rag-query-001",
    question: "What is the vacation policy?",
    kb_id: "kb-001",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
  },
  {
    query_id: "rag-query-002",
    question: "How do I authenticate with the API?",
    kb_id: "kb-002",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
  },
  {
    query_id: "rag-query-003",
    question: "What are the remote work guidelines?",
    kb_id: "kb-001",
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
  },
];

export const DEMO_RAG_RESPONSES = {
  "rag-query-001": {
    success: true,
    answer:
      "Employees receive 15 days of paid vacation per year, accrued monthly. Vacation must be requested at least 2 weeks in advance and approved by your manager. Unused vacation days can be carried over up to 5 days into the next year.",
    sources: [
      {
        document_id: "doc-kb-001",
        document_name: "Employee_Handbook_2024.pdf",
        page: 12,
        chunk_text:
          "Vacation Policy: Employees are entitled to 15 days of paid vacation annually...",
        relevance_score: 0.94,
      },
      {
        document_id: "doc-kb-002",
        document_name: "HR_Policies.pdf",
        page: 5,
        chunk_text:
          "Time off requests must be submitted through the HR portal at least 14 days prior...",
        relevance_score: 0.87,
      },
    ],
    confidence: 0.92,
    query_time_ms: 450,
  },
  "rag-query-002": {
    success: true,
    answer:
      "To authenticate with the API, include your API key in the Authorization header using Bearer authentication: `Authorization: Bearer YOUR_API_KEY`. API keys can be generated from the Settings → API Keys page. Each request must include this header for authentication.",
    sources: [
      {
        document_id: "doc-kb-003",
        document_name: "API_Documentation.pdf",
        page: 3,
        chunk_text:
          "Authentication: All API requests require authentication using Bearer tokens...",
        relevance_score: 0.96,
      },
      {
        document_id: "doc-kb-004",
        document_name: "Integration_Guide.pdf",
        page: 8,
        chunk_text:
          "Include the Authorization header with your API key: Authorization: Bearer <token>",
        relevance_score: 0.91,
      },
    ],
    confidence: 0.95,
    query_time_ms: 380,
  },
  "rag-query-003": {
    success: true,
    answer:
      "Remote work is permitted up to 3 days per week with manager approval. Remote workers must be available during core hours (10am-4pm) and maintain regular communication via Slack. A dedicated workspace and reliable internet connection are required.",
    sources: [
      {
        document_id: "doc-kb-001",
        document_name: "Employee_Handbook_2024.pdf",
        page: 18,
        chunk_text: "Remote Work Policy: Employees may work remotely up to 3 days per week...",
        relevance_score: 0.93,
      },
    ],
    confidence: 0.9,
    query_time_ms: 420,
  },
};

// Data sources for knowledge bases
export const DEMO_DATA_SOURCES = [
  {
    source_id: "source-001",
    kb_id: "kb-001",
    name: "Employee_Handbook_2024.pdf",
    type: "document",
    status: "indexed",
    chunk_count: 156,
    uploaded_at: "2024-01-01T00:00:00Z",
  },
  {
    source_id: "source-002",
    kb_id: "kb-001",
    name: "HR_Policies.pdf",
    type: "document",
    status: "indexed",
    chunk_count: 89,
    uploaded_at: "2024-01-05T00:00:00Z",
  },
  {
    source_id: "source-003",
    kb_id: "kb-002",
    name: "API_Documentation.pdf",
    type: "document",
    status: "indexed",
    chunk_count: 234,
    uploaded_at: "2024-01-10T00:00:00Z",
  },
  {
    source_id: "source-004",
    kb_id: "kb-002",
    name: "Integration_Guide.pdf",
    type: "document",
    status: "indexed",
    chunk_count: 145,
    uploaded_at: "2024-01-12T00:00:00Z",
  },
  {
    source_id: "source-005",
    kb_id: "kb-001",
    name: "Sales Data 2024",
    type: "structured_data",
    status: "indexed",
    chunk_count: 0,
    uploaded_at: "2024-02-01T00:00:00Z",
    config: {
      file_info: {
        filename: "sales_data_2024.csv",
        size: 2457600,
        row_count: 15230,
        column_count: 6,
      },
      schema_definition: {
        columns: [
          { name: "date", dtype: "datetime", is_dimension: true, description: "Transaction date" },
          {
            name: "product_name",
            dtype: "string",
            is_dimension: true,
            description: "Product name",
          },
          {
            name: "revenue",
            dtype: "float64",
            is_metric: true,
            default_agg: "sum",
            description: "Revenue in USD",
          },
          {
            name: "quantity",
            dtype: "int64",
            is_metric: true,
            default_agg: "sum",
            description: "Units sold",
          },
          { name: "region", dtype: "string", is_dimension: true, description: "Sales region" },
          {
            name: "category",
            dtype: "string",
            is_dimension: true,
            description: "Product category",
          },
        ],
      },
    },
  },
];
