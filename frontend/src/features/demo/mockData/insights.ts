/**
 * Mock insights and analytics data for demo mode
 */

export const DEMO_DATASETS = [
  {
    dataset_id: 'dataset-001',
    name: 'Q1 2024 Financial Data',
    description: 'Invoices and receipts from Q1 2024',
    document_count: 23,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-31T23:59:59Z',
    status: 'ready',
  },
  {
    dataset_id: 'dataset-002',
    name: 'Vendor Analysis',
    description: 'All vendor-related documents and invoices',
    document_count: 35,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: new Date().toISOString(),
    status: 'ready',
  },
  {
    dataset_id: 'dataset-003',
    name: 'Contract Repository',
    description: 'Legal contracts and agreements',
    document_count: 12,
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
    status: 'ready',
  },
];

export const DEMO_PRESET_QUERIES = [
  {
    query_id: 'query-001',
    question: 'What was the total revenue in Q1 2024?',
    dataset_id: 'dataset-001',
    category: 'financial',
  },
  {
    query_id: 'query-002',
    question: 'Who are the top 5 vendors by invoice amount?',
    dataset_id: 'dataset-002',
    category: 'vendor',
  },
  {
    query_id: 'query-003',
    question: 'Show invoice trends over the last 30 days',
    dataset_id: 'dataset-001',
    category: 'trends',
  },
  {
    query_id: 'query-004',
    question: 'How many contracts expire in the next 60 days?',
    dataset_id: 'dataset-003',
    category: 'contract',
  },
];

export const DEMO_QUERY_RESULTS = {
  'query-001': {
    success: true,
    answer: 'The total revenue in Q1 2024 was $487,523.45 based on 23 invoices processed.',
    chart_data: {
      type: 'bar',
      labels: ['January', 'February', 'March'],
      values: [145230.5, 182450.75, 159842.2],
    },
    sources: [
      {
        document_id: 'doc-001',
        filename: 'Invoice_Q1_2024.pdf',
        confidence: 0.96,
      },
    ],
  },
  'query-002': {
    success: true,
    answer: 'Top 5 vendors by invoice amount: Acme Corp ($125,400), Tech Solutions ($98,750), Office Supplies Inc ($76,200), Legal Services LLC ($54,300), Marketing Agency ($42,100)',
    chart_data: {
      type: 'pie',
      labels: ['Acme Corp', 'Tech Solutions', 'Office Supplies Inc', 'Legal Services LLC', 'Marketing Agency'],
      values: [125400, 98750, 76200, 54300, 42100],
    },
    sources: [],
  },
  'query-003': {
    success: true,
    answer: 'Invoice volume has increased by 15% compared to the previous 30-day period.',
    chart_data: {
      type: 'line',
      labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      values: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 3),
    },
    sources: [],
  },
  'query-004': {
    success: true,
    answer: '3 contracts expire in the next 60 days: ABC Corp Agreement (45 days), XYZ Services Contract (52 days), Vendor Partnership (58 days)',
    chart_data: null,
    sources: [
      {
        document_id: 'doc-003',
        filename: 'Contract_ABC_Corp.pdf',
        confidence: 0.94,
      },
    ],
  },
};
