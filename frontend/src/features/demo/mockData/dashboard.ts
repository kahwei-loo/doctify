/**
 * Mock dashboard data for demo mode
 */

// Generate 30 days of trend data
const generateTrendData = () => {
  const data = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      documents_processed: Math.floor(Math.random() * 10) + 5, // 5-15 per day
      success_rate: 0.85 + Math.random() * 0.1, // 85-95%
      avg_processing_time: 2000 + Math.random() * 2000, // 2-4 seconds
    });
  }

  return data;
};

export const DEMO_DASHBOARD_STATS = {
  total_projects: 8,
  total_documents: 47,
  processed_documents: 33,
  pending_documents: 3,
  processing_documents: 8,
  failed_documents: 3,
  success_rate: 0.94, // 94%
  total_tokens_used: 125000,
  estimated_cost: 2.45, // USD
};

export const DEMO_DASHBOARD_TRENDS = generateTrendData();

export const DEMO_QUICK_ACTIONS = [
  {
    id: 'upload',
    title: 'Upload Documents',
    description: 'Add new documents for processing',
    icon: 'upload',
    disabled: true, // Disabled in demo mode
    tooltip: 'File uploads disabled in demo mode',
  },
  {
    id: 'create-project',
    title: 'Create Project',
    description: 'Start a new document project',
    icon: 'folder-plus',
    disabled: true,
    tooltip: 'Creating projects disabled in demo mode',
  },
  {
    id: 'view-insights',
    title: 'View Insights',
    description: 'Analyze your document data',
    icon: 'chart-bar',
    disabled: false,
  },
  {
    id: 'ask-ai',
    title: 'Ask AI Assistant',
    description: 'Get help from AI',
    icon: 'robot',
    disabled: false,
  },
];

export const DEMO_RECENT_ACTIVITY = [
  {
    activity_id: 'activity-001',
    activity_type: 'document' as const,
    title: 'Invoice_Q1_2024.pdf processed successfully',
    subtitle: 'Q1 2024 Invoices',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    metadata: {
      document_id: 'doc-001',
      confidence: 0.96,
    },
  },
  {
    activity_id: 'activity-002',
    activity_type: 'document' as const,
    title: 'Receipt_2024-02-03.jpg',
    subtitle: 'Expense Receipts',
    status: 'processing',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    metadata: {
      document_id: 'doc-002',
    },
  },
  {
    activity_id: 'activity-003',
    activity_type: 'document' as const,
    title: 'Contract_ABC_Corp.pdf processed',
    subtitle: 'Legal Contracts',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    metadata: {
      document_id: 'doc-003',
      confidence: 0.94,
    },
  },
  {
    activity_id: 'activity-004',
    activity_type: 'conversation' as const,
    title: 'Document analysis query',
    subtitle: 'AI Assistant',
    status: 'resolved',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
    metadata: {
      conversation_id: 'conv-001',
      message_count: 5,
    },
  },
  {
    activity_id: 'activity-005',
    activity_type: 'document' as const,
    title: 'Insurance_Policy.pdf',
    subtitle: null,
    status: 'failed',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    metadata: {
      document_id: 'doc-008',
      error: 'Document quality too low',
    },
  },
];
