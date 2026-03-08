/**
 * Mock AI Assistants data for demo mode
 */

export const DEMO_ASSISTANTS = [
  {
    id: "asst-001",
    user_id: "demo-user",
    name: "Document Analyzer",
    description: "Analyzes documents and extracts key information",
    model_configuration: {
      provider: "openai",
      model: "gpt-4-turbo",
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt:
        "You are a document analysis assistant. Extract key information from documents including dates, amounts, parties, and terms. Provide structured output in JSON format.",
    },
    widget_config: {},
    is_active: true,
    knowledge_base_id: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    total_conversations: 45,
    unresolved_count: 3,
  },
  {
    id: "asst-002",
    user_id: "demo-user",
    name: "Data Extractor",
    description: "Specialized in extracting structured data from invoices and receipts",
    model_configuration: {
      provider: "openai",
      model: "gpt-4-turbo",
      temperature: 0.5,
      max_tokens: 2048,
      system_prompt:
        "You are a data extraction specialist. Focus on extracting invoice numbers, dates, line items, totals, and vendor information. Validate extracted amounts and dates.",
    },
    widget_config: {},
    is_active: true,
    knowledge_base_id: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    total_conversations: 62,
    unresolved_count: 5,
  },
];

export const DEMO_ASSISTANT_CONVERSATIONS = {
  "asst-001": [
    {
      conversation_id: "asst-conv-001",
      assistant_id: "asst-001",
      title: "Contract Analysis Session",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      message_count: 6,
      status: "resolved",
    },
    {
      conversation_id: "asst-conv-002",
      assistant_id: "asst-001",
      title: "Document Review",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      message_count: 4,
      status: "resolved",
    },
  ],
  "asst-002": [
    {
      conversation_id: "asst-conv-003",
      assistant_id: "asst-002",
      title: "Invoice Batch Processing",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      message_count: 8,
      status: "in_progress",
    },
    {
      conversation_id: "asst-conv-004",
      assistant_id: "asst-002",
      title: "Receipt Data Extraction",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
      message_count: 5,
      status: "resolved",
    },
  ],
};

export const DEMO_ASSISTANT_MESSAGES = {
  "asst-conv-001": [
    {
      message_id: "asst-msg-001-01",
      conversation_id: "asst-conv-001",
      role: "user",
      content: "Analyze Contract_ABC_Corp.pdf and extract key terms",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      attachments: [{ filename: "Contract_ABC_Corp.pdf", document_id: "doc-003" }],
    },
    {
      message_id: "asst-msg-001-02",
      conversation_id: "asst-conv-001",
      role: "assistant",
      content: `I've analyzed the contract. Here are the key terms:

**Parties:**
- Client: ABC Corporation
- Provider: XYZ Services Inc.

**Financial Terms:**
- Monthly Payment: $10,000
- Payment Terms: Net 30
- Total Contract Value: $120,000 (12 months)

**Duration:**
- Start Date: January 1, 2024
- End Date: December 31, 2024
- Auto-renewal: No

**Key Clauses:**
- Termination: 30 days written notice required
- Confidentiality: 2 years post-termination
- Liability Cap: $50,000

Would you like me to provide more details on any specific clause?`,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 11.95).toISOString(),
    },
  ],
  "asst-conv-003": [
    {
      message_id: "asst-msg-003-01",
      conversation_id: "asst-conv-003",
      role: "user",
      content: "Extract data from these 5 invoices",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      attachments: [
        { filename: "Invoice_001.pdf", document_id: "doc-011" },
        { filename: "Invoice_002.pdf", document_id: "doc-012" },
        { filename: "Invoice_003.pdf", document_id: "doc-013" },
        { filename: "Invoice_004.pdf", document_id: "doc-014" },
        { filename: "Invoice_005.pdf", document_id: "doc-015" },
      ],
    },
    {
      message_id: "asst-msg-003-02",
      conversation_id: "asst-conv-003",
      role: "assistant",
      content: `I've processed all 5 invoices. Here's the summary:

**Invoice_001.pdf**
- Invoice #: INV-2024-001
- Date: 2024-02-01
- Vendor: Tech Supplies Co.
- Total: $1,245.00
- Status: ✅ Validated

**Invoice_002.pdf**
- Invoice #: INV-2024-002
- Date: 2024-02-03
- Vendor: Office Plus
- Total: $890.50
- Status: ✅ Validated

**Invoice_003.pdf**
- Invoice #: INV-2024-003
- Date: 2024-02-05
- Vendor: Marketing Solutions
- Total: $3,200.00
- Status: ✅ Validated

**Invoice_004.pdf**
- Invoice #: INV-2024-004
- Date: 2024-02-07
- Vendor: Legal Services
- Total: $5,400.00
- Status: ✅ Validated

**Invoice_005.pdf**
- Invoice #: INV-2024-005
- Date: 2024-02-08
- Vendor: Cloud Services Inc.
- Total: $450.00
- Status: ✅ Validated

**Summary:**
- Total Amount: $11,185.50
- All invoices validated successfully
- Ready for export to CSV/JSON

Would you like me to export this data?`,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5.95).toISOString(),
    },
  ],
};

export const DEMO_ASSISTANTS_STATS = {
  total_assistants: DEMO_ASSISTANTS.length,
  active_assistants: DEMO_ASSISTANTS.filter((a) => a.is_active).length,
  total_conversations: Object.values(DEMO_ASSISTANT_CONVERSATIONS).flat().length,
  total_messages: Object.values(DEMO_ASSISTANT_MESSAGES).flat().length,
  avg_response_time_ms: 2095,
};
