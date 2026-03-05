/**
 * Mock documents data for demo mode
 */

import {
  generateTimestamp,
  generateFileSize,
  generateProcessingTime,
  generateConfidenceScore,
  generateDocumentStatus,
  generateFileType,
  generateDocumentFilename,
  pickRandom,
} from "../utils/dataGenerator";

type DocumentStatus = "pending" | "processing" | "completed" | "failed";

interface MockDocument {
  document_id: string;
  filename: string;
  file_size: number; // bytes
  mime_type: string;
  status: DocumentStatus;
  created_at: string;
  completed_at?: string;
  project_id?: string;
  project_name?: string;
  confidence_score?: number;
  extraction_result?: {
    text: string;
    confidence: number;
    metadata?: Record<string, any>;
    extracted_data?: Record<string, any>;
    confidence_scores?: Record<string, number>;
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
  error_message?: string;
}

// Helper to generate timestamps
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const DEMO_DOCUMENTS: MockDocument[] = [
  {
    document_id: "doc-001",
    filename: "Invoice_Q1_2024.pdf",
    file_size: 524288, // 512 KB
    mime_type: "application/pdf",
    status: "completed",
    project_id: "proj-001",
    project_name: "Q1 2024 Invoices",
    created_at: daysAgo(1),
    completed_at: daysAgo(1),
    confidence_score: 0.96,
    extraction_result: {
      text: `INVOICE\n\nInvoice #: INV-2024-0015\nDate: 2024-01-15\n\nBill To:\nAcme Corporation\n123 Business St\nNew York, NY 10001\n\nDescription          Qty    Unit Price    Total\nConsulting Services   40    $150.00      $6,000.00\nSoftware License      1     $500.00      $500.00\n\nSubtotal: $6,500.00\nTax (8%): $520.00\nTotal: $7,020.00\n\nPayment Terms: Net 30\nDue Date: 2024-02-15`,
      confidence: 0.96,
      metadata: {
        model: "gpt-4-vision-preview",
        provider: "openai",
        process_time: 4500,
        token_usage: { prompt_tokens: 2500, completion_tokens: 1200, total_tokens: 3700 },
        docType: "Invoice",
      },
      extracted_data: {
        invoice_number: "INV-2024-0015",
        invoice_date: "2024-01-15",
        due_date: "2024-02-15",
        customer_name: "Acme Corporation",
        customer_address: "123 Business St, New York, NY 10001",
        subtotal: 6500.0,
        tax_rate: "8%",
        tax_amount: 520.0,
        total_amount: 7020.0,
        payment_terms: "Net 30",
        currency: "USD",
        line_items: [
          {
            itemNo: "1",
            description: "Consulting Services",
            quantity: 40,
            unitPrice: 150.0,
            amount: 6000.0,
          },
          {
            itemNo: "2",
            description: "Software License",
            quantity: 1,
            unitPrice: 500.0,
            amount: 500.0,
          },
        ],
      },
      confidence_scores: {
        invoice_number: 0.98,
        invoice_date: 0.97,
        total_amount: 0.99,
        customer_name: 0.95,
      },
      entities: [
        { type: "invoice_number", value: "INV-2024-0015", confidence: 0.98 },
        { type: "date", value: "2024-01-15", confidence: 0.97 },
        { type: "total_amount", value: "7020.00", confidence: 0.99 },
        { type: "customer_name", value: "Acme Corporation", confidence: 0.95 },
      ],
    },
  },
  {
    document_id: "doc-002",
    filename: "Receipt_2024-02-03.jpg",
    file_size: 245760, // 240 KB
    mime_type: "image/jpeg",
    status: "processing",
    project_id: "proj-002",
    project_name: "Expense Receipts",
    created_at: daysAgo(0),
  },
  {
    document_id: "doc-003",
    filename: "Contract_ABC_Corp.pdf",
    file_size: 1048576, // 1 MB
    mime_type: "application/pdf",
    status: "completed",
    project_id: "proj-003",
    project_name: "Legal Contracts",
    created_at: daysAgo(2),
    completed_at: daysAgo(2),
    confidence_score: 0.94,
    extraction_result: {
      text: `SERVICE AGREEMENT\n\nThis Service Agreement ("Agreement") is entered into as of January 1, 2024\nbetween ABC Corporation ("Client") and XYZ Services Inc. ("Provider").\n\n1. SERVICES\nProvider shall provide consulting services as described in Exhibit A.\n\n2. TERM\nThis Agreement shall commence on January 1, 2024 and continue for 12 months.\n\n3. COMPENSATION\nClient shall pay Provider $10,000 per month for services rendered.\n\n4. TERMINATION\nEither party may terminate with 30 days written notice.`,
      confidence: 0.94,
      metadata: {
        model: "claude-3-sonnet",
        provider: "anthropic",
        process_time: 6200,
        token_usage: { prompt_tokens: 3200, completion_tokens: 1800, total_tokens: 5000 },
        docType: "Contract",
      },
      extracted_data: {
        contract_type: "Service Agreement",
        effective_date: "2024-01-01",
        term_duration: "12 months",
        client_name: "ABC Corporation",
        provider_name: "XYZ Services Inc.",
        monthly_compensation: 10000,
        termination_notice: "30 days written notice",
        currency: "USD",
      },
      confidence_scores: {
        contract_type: 0.96,
        effective_date: 0.96,
        client_name: 0.97,
        provider_name: 0.97,
        monthly_compensation: 0.95,
      },
      entities: [
        { type: "contract_date", value: "2024-01-01", confidence: 0.96 },
        { type: "party_name", value: "ABC Corporation", confidence: 0.97 },
        { type: "party_name", value: "XYZ Services Inc.", confidence: 0.97 },
        { type: "amount", value: "10000", confidence: 0.95 },
      ],
    },
  },
  {
    document_id: "doc-004",
    filename: "Bank_Statement_Jan2024.pdf",
    file_size: 387072, // 378 KB
    mime_type: "application/pdf",
    status: "completed",
    created_at: daysAgo(3),
    completed_at: daysAgo(3),
    confidence_score: 0.93,
    extraction_result: {
      text: `BANK STATEMENT\nAccount: ****1234\nPeriod: January 1 - January 31, 2024\n\nBeginning Balance: $15,420.00\n\nTransactions:\n01/05 - Deposit          +$5,000.00\n01/10 - Payment #1234    -$2,340.00\n01/15 - Wire Transfer    +$10,000.00\n01/20 - ACH Payment      -$1,500.00\n01/25 - Service Charge   -$15.00\n\nEnding Balance: $26,565.00`,
      confidence: 0.93,
      metadata: {
        model: "gpt-4-vision-preview",
        provider: "openai",
        process_time: 3800,
        token_usage: { prompt_tokens: 2000, completion_tokens: 900, total_tokens: 2900 },
        docType: "Bank Statement",
      },
      extracted_data: {
        account_number: "****1234",
        statement_period: "January 1 - January 31, 2024",
        beginning_balance: 15420.0,
        ending_balance: 26565.0,
        total_deposits: 15000.0,
        total_withdrawals: 3855.0,
        transaction_count: 5,
        currency: "USD",
      },
    },
  },
  {
    document_id: "doc-005",
    filename: "Tax_Form_W2.pdf",
    file_size: 156234, // 152 KB
    mime_type: "application/pdf",
    status: "completed",
    project_id: "proj-004",
    project_name: "Tax Documents 2023",
    created_at: daysAgo(4),
    completed_at: daysAgo(4),
    confidence_score: 0.97,
    extraction_result: {
      text: `Form W-2 Wage and Tax Statement 2023\n\nEmployer: Tech Solutions Inc.\nEIN: 12-3456789\n\nEmployee: John Doe\nSSN: ***-**-5678\n\nWages: $85,000.00\nFederal Tax Withheld: $12,750.00\nSocial Security Tax: $5,270.00\nMedicare Tax: $1,232.50`,
      confidence: 0.97,
      metadata: {
        model: "gemini-1.5-pro",
        provider: "google",
        process_time: 3200,
        token_usage: { prompt_tokens: 1800, completion_tokens: 800, total_tokens: 2600 },
        docType: "Tax Form",
      },
      extracted_data: {
        form_type: "W-2",
        tax_year: "2023",
        employer_name: "Tech Solutions Inc.",
        employer_ein: "12-3456789",
        employee_name: "John Doe",
        wages: 85000.0,
        federal_tax_withheld: 12750.0,
        social_security_tax: 5270.0,
        medicare_tax: 1232.5,
        currency: "USD",
      },
      confidence_scores: {
        form_type: 0.99,
        tax_year: 0.98,
        wages: 0.96,
      },
      entities: [
        { type: "form_type", value: "W-2", confidence: 0.99 },
        { type: "year", value: "2023", confidence: 0.98 },
        { type: "wages", value: "85000.00", confidence: 0.96 },
      ],
    },
  },
  {
    document_id: "doc-006",
    filename: "Purchase_Order_5678.pdf",
    file_size: 298765, // 292 KB
    mime_type: "application/pdf",
    status: "pending",
    project_id: "proj-001",
    project_name: "Q1 2024 Invoices",
    created_at: daysAgo(0),
  },
  {
    document_id: "doc-007",
    filename: "Medical_Bill_2024.png",
    file_size: 445678, // 435 KB
    mime_type: "image/png",
    status: "completed",
    created_at: daysAgo(5),
    completed_at: daysAgo(5),
    confidence_score: 0.91,
    extraction_result: {
      text: `MEDICAL BILL\n\nPatient: Jane Smith\nDate of Service: 2024-01-20\n\nProcedure: Annual Physical Exam\nProvider: Dr. Johnson\n\nCharges:\nOffice Visit: $250.00\nLab Tests: $180.00\nTotal: $430.00\n\nInsurance Payment: $344.00\nPatient Responsibility: $86.00`,
      confidence: 0.91,
      metadata: {
        model: "claude-3-sonnet",
        provider: "anthropic",
        process_time: 4100,
        token_usage: { prompt_tokens: 2200, completion_tokens: 1000, total_tokens: 3200 },
        docType: "Medical Bill",
      },
      extracted_data: {
        patient_name: "Jane Smith",
        date_of_service: "2024-01-20",
        procedure: "Annual Physical Exam",
        provider_name: "Dr. Johnson",
        total_charges: 430.0,
        insurance_payment: 344.0,
        patient_responsibility: 86.0,
        currency: "USD",
        line_items: [
          {
            itemNo: "1",
            description: "Office Visit",
            quantity: 1,
            unitPrice: 250.0,
            amount: 250.0,
          },
          { itemNo: "2", description: "Lab Tests", quantity: 1, unitPrice: 180.0, amount: 180.0 },
        ],
      },
    },
  },
  {
    document_id: "doc-008",
    filename: "Insurance_Policy.pdf",
    file_size: 678234, // 662 KB
    mime_type: "application/pdf",
    status: "failed",
    created_at: daysAgo(1),
    error_message: "Document quality too low for OCR processing",
  },
  {
    document_id: "doc-009",
    filename: "Delivery_Receipt_789.jpg",
    file_size: 189456, // 185 KB
    mime_type: "image/jpeg",
    status: "completed",
    project_id: "proj-002",
    project_name: "Expense Receipts",
    created_at: daysAgo(6),
    completed_at: daysAgo(6),
    confidence_score: 0.89,
    extraction_result: {
      text: `DELIVERY RECEIPT\n\nOrder #: ORD-789\nDelivered: 2024-01-25 14:30\n\nRecipient: Office Manager\nSignature: [Signed]\n\nItems:\n- Office Supplies (Box 1 of 2)\n- Office Supplies (Box 2 of 2)\n\nDelivery Status: Complete`,
      confidence: 0.89,
      metadata: {
        model: "gpt-4-vision-preview",
        provider: "openai",
        process_time: 2800,
        token_usage: { prompt_tokens: 1500, completion_tokens: 700, total_tokens: 2200 },
        docType: "Receipt",
      },
      extracted_data: {
        order_number: "ORD-789",
        delivery_date: "2024-01-25",
        delivery_time: "14:30",
        recipient: "Office Manager",
        signature_present: true,
        delivery_status: "Complete",
        item_count: 2,
      },
    },
  },
  {
    document_id: "doc-010",
    filename: "Legal_Notice_2024.pdf",
    file_size: 234567, // 229 KB
    mime_type: "application/pdf",
    status: "processing",
    project_id: "proj-003",
    project_name: "Legal Contracts",
    created_at: daysAgo(0),
  },
];

// Generate additional 37 documents to reach 47 total
const generateAdditionalDocuments = (): MockDocument[] => {
  const additionalDocs: MockDocument[] = [];
  const projectIds = ["proj-001", "proj-002", "proj-003", "proj-004", undefined];
  const projectNames = [
    "Q1 2024 Invoices",
    "Expense Receipts",
    "Legal Contracts",
    "Tax Documents 2023",
    undefined,
  ];

  for (let i = 11; i <= 47; i++) {
    const status = generateDocumentStatus();
    const fileType = generateFileType();
    const filename = `${generateDocumentFilename("document", i)}.${fileType.extension}`;
    const daysAgo = Math.floor(Math.random() * 30); // Random day within last 30 days
    const projectIndex = Math.floor(Math.random() * projectIds.length);

    const doc: MockDocument = {
      document_id: `doc-${String(i).padStart(3, "0")}`,
      filename,
      file_size: generateFileSize(),
      mime_type: fileType.mimeType,
      status,
      created_at: generateTimestamp(daysAgo),
      project_id: projectIds[projectIndex],
      project_name: projectNames[projectIndex],
    };

    // Add completion data for completed documents
    if (status === "completed") {
      doc.completed_at = generateTimestamp(daysAgo - 0.1); // Completed shortly after creation
      doc.confidence_score = generateConfidenceScore();
      const models = ["gpt-4-vision-preview", "claude-3-sonnet", "gemini-1.5-pro"];
      const providers = ["openai", "anthropic", "google"];
      const docTypes = ["Invoice", "Receipt", "Contract", "Report", "Letter"];
      const modelIdx = i % models.length;
      const amount = parseFloat((Math.random() * 10000).toFixed(2));
      doc.extraction_result = {
        text: `Sample extracted text from ${filename}`,
        confidence: doc.confidence_score,
        metadata: {
          model: models[modelIdx],
          provider: providers[modelIdx],
          process_time: generateProcessingTime(),
          token_usage: {
            prompt_tokens: 1500 + Math.floor(Math.random() * 2000),
            completion_tokens: 500 + Math.floor(Math.random() * 1000),
            total_tokens: 2000 + Math.floor(Math.random() * 3000),
          },
          docType: pickRandom(docTypes),
        },
        extracted_data: {
          document_date: new Date().toISOString().split("T")[0],
          total_amount: amount,
          reference_number: `REF-${String(i).padStart(4, "0")}`,
          currency: "USD",
        },
        entities: [
          {
            type: "date",
            value: new Date().toISOString().split("T")[0],
            confidence: generateConfidenceScore(0.9, 0.99),
          },
          {
            type: "amount",
            value: `$${amount.toFixed(2)}`,
            confidence: generateConfidenceScore(0.85, 0.98),
          },
        ],
      };
    }

    // Add error message for failed documents
    if (status === "failed") {
      const errorMessages = [
        "Document quality too low for OCR processing",
        "Unsupported file format",
        "File corrupted or damaged",
        "Processing timeout exceeded",
      ];
      doc.error_message = pickRandom(errorMessages);
    }

    additionalDocs.push(doc);
  }

  return additionalDocs;
};

// Combine base documents with generated ones
const ALL_DEMO_DOCUMENTS = [...DEMO_DOCUMENTS, ...generateAdditionalDocuments()];

export { ALL_DEMO_DOCUMENTS as DEMO_DOCUMENTS };

// Statistics for documents
export const DEMO_DOCUMENTS_STATS = {
  total: ALL_DEMO_DOCUMENTS.length,
  by_status: {
    pending: ALL_DEMO_DOCUMENTS.filter((d) => d.status === "pending").length,
    processing: ALL_DEMO_DOCUMENTS.filter((d) => d.status === "processing").length,
    completed: ALL_DEMO_DOCUMENTS.filter((d) => d.status === "completed").length,
    failed: ALL_DEMO_DOCUMENTS.filter((d) => d.status === "failed").length,
  },
  by_type: {
    pdf: ALL_DEMO_DOCUMENTS.filter((d) => d.mime_type === "application/pdf").length,
    jpg: ALL_DEMO_DOCUMENTS.filter((d) => d.mime_type === "image/jpeg").length,
    png: ALL_DEMO_DOCUMENTS.filter((d) => d.mime_type === "image/png").length,
  },
};
