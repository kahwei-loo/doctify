/**
 * Mock projects data for demo mode
 */

interface MockProject {
  project_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  is_archived: boolean;
  extraction_config?: Record<string, unknown>;
}

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const DEMO_PROJECTS: MockProject[] = [
  {
    project_id: "proj-001",
    name: "Q1 2024 Invoices",
    description: "Invoice processing and extraction for Q1 2024",
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    document_count: 15,
    is_archived: false,
    extraction_config: {
      auto_process: true,
      ocr_language: "en",
      output_format: "json",
    },
  },
  {
    project_id: "proj-002",
    name: "Expense Receipts",
    description: "Employee expense receipt scanning and categorization",
    created_at: daysAgo(45),
    updated_at: daysAgo(2),
    document_count: 12,
    is_archived: false,
    extraction_config: {
      auto_process: true,
      ocr_language: "en",
      output_format: "csv",
    },
  },
  {
    project_id: "proj-003",
    name: "Legal Contracts",
    description: "Contract analysis and key term extraction",
    created_at: daysAgo(60),
    updated_at: daysAgo(3),
    document_count: 8,
    is_archived: false,
    extraction_config: {
      auto_process: false,
      ocr_language: "en",
      output_format: "json",
    },
  },
  {
    project_id: "proj-004",
    name: "Tax Documents 2023",
    description: "Tax form processing and data extraction",
    created_at: daysAgo(90),
    updated_at: daysAgo(10),
    document_count: 5,
    is_archived: true,
    extraction_config: {
      auto_process: true,
      ocr_language: "en",
      output_format: "json",
    },
  },
  {
    project_id: "proj-005",
    name: "HR Documents",
    description: "Employee records and HR documentation processing",
    created_at: daysAgo(75),
    updated_at: daysAgo(5),
    document_count: 8,
    is_archived: false,
    extraction_config: {
      auto_process: false,
      ocr_language: "en",
      output_format: "json",
    },
  },
  {
    project_id: "proj-006",
    name: "Vendor Invoices Q4",
    description: "Q4 vendor invoice processing and reconciliation",
    created_at: daysAgo(50),
    updated_at: daysAgo(3),
    document_count: 18,
    is_archived: false,
    extraction_config: {
      auto_process: true,
      ocr_language: "en",
      output_format: "csv",
    },
  },
  {
    project_id: "proj-007",
    name: "Insurance Claims",
    description: "Insurance claim forms and medical bills",
    created_at: daysAgo(40),
    updated_at: daysAgo(7),
    document_count: 6,
    is_archived: false,
    extraction_config: {
      auto_process: true,
      ocr_language: "en",
      output_format: "json",
    },
  },
  {
    project_id: "proj-008",
    name: "Property Documents",
    description: "Lease agreements and property contracts",
    created_at: daysAgo(35),
    updated_at: daysAgo(12),
    document_count: 4,
    is_archived: false,
    extraction_config: {
      auto_process: false,
      ocr_language: "en",
      output_format: "json",
    },
  },
];

export const DEMO_PROJECTS_STATS = {
  total: DEMO_PROJECTS.length,
  active: DEMO_PROJECTS.filter((p) => !p.is_archived).length,
  archived: DEMO_PROJECTS.filter((p) => p.is_archived).length,
  total_documents: DEMO_PROJECTS.reduce((sum, p) => sum + p.document_count, 0),
};
