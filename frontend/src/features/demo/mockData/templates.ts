/**
 * Mock templates data for demo mode
 */

export interface MockTemplate {
  template_id: string;
  name: string;
  description: string;
  document_type: string;
  fields: Array<{
    field_id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'currency' | 'email' | 'phone';
    required: boolean;
    description?: string;
  }>;
  usage_count: number;
  accuracy_rate: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  created_by: string;
}

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const DEMO_TEMPLATES: MockTemplate[] = [
  {
    template_id: 'tmpl-001',
    name: 'Standard Invoice',
    description: 'Extract common invoice fields including vendor, amounts, dates, and line items',
    document_type: 'invoice',
    fields: [
      { field_id: 'f1', name: 'Invoice Number', type: 'text', required: true },
      { field_id: 'f2', name: 'Invoice Date', type: 'date', required: true },
      { field_id: 'f3', name: 'Due Date', type: 'date', required: false },
      { field_id: 'f4', name: 'Vendor Name', type: 'text', required: true },
      { field_id: 'f5', name: 'Subtotal', type: 'currency', required: true },
      { field_id: 'f6', name: 'Tax Amount', type: 'currency', required: false },
      { field_id: 'f7', name: 'Total Amount', type: 'currency', required: true },
    ],
    usage_count: 234,
    accuracy_rate: 0.96,
    created_at: daysAgo(60),
    updated_at: daysAgo(5),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-002',
    name: 'Receipt Scanner',
    description: 'Quick extraction for retail receipts and expense documents',
    document_type: 'receipt',
    fields: [
      { field_id: 'f1', name: 'Store Name', type: 'text', required: true },
      { field_id: 'f2', name: 'Date', type: 'date', required: true },
      { field_id: 'f3', name: 'Total', type: 'currency', required: true },
      { field_id: 'f4', name: 'Payment Method', type: 'text', required: false },
      { field_id: 'f5', name: 'Tax', type: 'currency', required: false },
    ],
    usage_count: 189,
    accuracy_rate: 0.94,
    created_at: daysAgo(45),
    updated_at: daysAgo(2),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-003',
    name: 'Contract Analyzer',
    description: 'Extract key terms, dates, and parties from legal contracts',
    document_type: 'contract',
    fields: [
      { field_id: 'f1', name: 'Contract Title', type: 'text', required: true },
      { field_id: 'f2', name: 'Party A', type: 'text', required: true },
      { field_id: 'f3', name: 'Party B', type: 'text', required: true },
      { field_id: 'f4', name: 'Effective Date', type: 'date', required: true },
      { field_id: 'f5', name: 'Expiration Date', type: 'date', required: false },
      { field_id: 'f6', name: 'Contract Value', type: 'currency', required: false },
      { field_id: 'f7', name: 'Governing Law', type: 'text', required: false },
    ],
    usage_count: 78,
    accuracy_rate: 0.92,
    created_at: daysAgo(30),
    updated_at: daysAgo(7),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-004',
    name: 'Purchase Order',
    description: 'Extract PO details including items, quantities, and delivery info',
    document_type: 'purchase_order',
    fields: [
      { field_id: 'f1', name: 'PO Number', type: 'text', required: true },
      { field_id: 'f2', name: 'Order Date', type: 'date', required: true },
      { field_id: 'f3', name: 'Vendor', type: 'text', required: true },
      { field_id: 'f4', name: 'Ship To Address', type: 'text', required: false },
      { field_id: 'f5', name: 'Delivery Date', type: 'date', required: false },
      { field_id: 'f6', name: 'Total Amount', type: 'currency', required: true },
    ],
    usage_count: 156,
    accuracy_rate: 0.95,
    created_at: daysAgo(40),
    updated_at: daysAgo(3),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-005',
    name: 'Bank Statement',
    description: 'Extract account info, transactions, and balances from bank statements',
    document_type: 'bank_statement',
    fields: [
      { field_id: 'f1', name: 'Account Number', type: 'text', required: true },
      { field_id: 'f2', name: 'Statement Period', type: 'text', required: true },
      { field_id: 'f3', name: 'Opening Balance', type: 'currency', required: true },
      { field_id: 'f4', name: 'Closing Balance', type: 'currency', required: true },
      { field_id: 'f5', name: 'Total Deposits', type: 'currency', required: false },
      { field_id: 'f6', name: 'Total Withdrawals', type: 'currency', required: false },
    ],
    usage_count: 67,
    accuracy_rate: 0.93,
    created_at: daysAgo(25),
    updated_at: daysAgo(10),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-006',
    name: 'Tax Form W-2',
    description: 'Extract wage and tax information from W-2 forms',
    document_type: 'tax_form',
    fields: [
      { field_id: 'f1', name: 'Employer Name', type: 'text', required: true },
      { field_id: 'f2', name: 'Employer EIN', type: 'text', required: true },
      { field_id: 'f3', name: 'Employee Name', type: 'text', required: true },
      { field_id: 'f4', name: 'Tax Year', type: 'text', required: true },
      { field_id: 'f5', name: 'Wages', type: 'currency', required: true },
      { field_id: 'f6', name: 'Federal Tax Withheld', type: 'currency', required: true },
      { field_id: 'f7', name: 'Social Security Tax', type: 'currency', required: false },
      { field_id: 'f8', name: 'Medicare Tax', type: 'currency', required: false },
    ],
    usage_count: 45,
    accuracy_rate: 0.97,
    created_at: daysAgo(90),
    updated_at: daysAgo(15),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-007',
    name: 'Shipping Label',
    description: 'Extract tracking, address, and package information from shipping labels',
    document_type: 'shipping',
    fields: [
      { field_id: 'f1', name: 'Tracking Number', type: 'text', required: true },
      { field_id: 'f2', name: 'Carrier', type: 'text', required: true },
      { field_id: 'f3', name: 'Ship From', type: 'text', required: false },
      { field_id: 'f4', name: 'Ship To', type: 'text', required: true },
      { field_id: 'f5', name: 'Weight', type: 'text', required: false },
      { field_id: 'f6', name: 'Ship Date', type: 'date', required: false },
    ],
    usage_count: 98,
    accuracy_rate: 0.91,
    created_at: daysAgo(20),
    updated_at: daysAgo(1),
    is_active: true,
    created_by: 'demo@doctify.ai',
  },
  {
    template_id: 'tmpl-008',
    name: 'ID Card Scanner',
    description: 'Extract personal information from ID cards and driver licenses',
    document_type: 'id_card',
    fields: [
      { field_id: 'f1', name: 'Full Name', type: 'text', required: true },
      { field_id: 'f2', name: 'ID Number', type: 'text', required: true },
      { field_id: 'f3', name: 'Date of Birth', type: 'date', required: true },
      { field_id: 'f4', name: 'Expiry Date', type: 'date', required: false },
      { field_id: 'f5', name: 'Address', type: 'text', required: false },
    ],
    usage_count: 34,
    accuracy_rate: 0.89,
    created_at: daysAgo(15),
    updated_at: daysAgo(4),
    is_active: false, // Disabled template for demo variety
    created_by: 'demo@doctify.ai',
  },
];

export const DEMO_TEMPLATES_STATS = {
  total: DEMO_TEMPLATES.length,
  active: DEMO_TEMPLATES.filter((t) => t.is_active).length,
  inactive: DEMO_TEMPLATES.filter((t) => !t.is_active).length,
  total_usage: DEMO_TEMPLATES.reduce((sum, t) => sum + t.usage_count, 0),
  avg_accuracy: (DEMO_TEMPLATES.reduce((sum, t) => sum + t.accuracy_rate, 0) / DEMO_TEMPLATES.length).toFixed(2),
  by_type: {
    invoice: DEMO_TEMPLATES.filter((t) => t.document_type === 'invoice').length,
    receipt: DEMO_TEMPLATES.filter((t) => t.document_type === 'receipt').length,
    contract: DEMO_TEMPLATES.filter((t) => t.document_type === 'contract').length,
    other: DEMO_TEMPLATES.filter((t) => !['invoice', 'receipt', 'contract'].includes(t.document_type)).length,
  },
};
