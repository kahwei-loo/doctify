/**
 * Mock data for unified knowledge base queries (RAG + Analytics)
 *
 * Provides mock responses for both RAG document queries and analytics
 * structured data queries in demo mode.
 */

import type { UnifiedQueryResponse } from "../../knowledge-base/types";

// ── RAG Response Mocks ──────────────────────────────────────────────

export const MOCK_RAG_RESPONSE: UnifiedQueryResponse = {
  id: "uq-rag-001",
  intent_type: "rag",
  confidence: 0.94,
  rag_response: {
    answer:
      "According to the contract documents, the payment terms specify Net 30 days from invoice date. " +
      "A 2% early payment discount is available for payments made within 10 days. " +
      "Late payments are subject to a 1.5% monthly interest charge. " +
      "All payments should be made via bank transfer to the account specified in Section 8.2.",
    sources: [
      {
        chunk_text:
          "Payment Terms: All invoices are due within 30 days of receipt (Net 30). " +
          "Early payment discount of 2% available for payments within 10 days.",
        document_id: "doc-001",
        document_name: "Service_Agreement_2026.pdf",
        similarity_score: 0.95,
      },
      {
        chunk_text:
          "Late Payment Penalties: Payments received after the due date will be subject to " +
          "a late payment fee of 1.5% per month on the outstanding balance.",
        document_id: "doc-001",
        document_name: "Service_Agreement_2026.pdf",
        similarity_score: 0.88,
      },
      {
        chunk_text:
          "Section 8.2 - Bank Details: All payments shall be made via wire transfer to " +
          "the designated bank account. ACH payments are also accepted.",
        document_id: "doc-001",
        document_name: "Service_Agreement_2026.pdf",
        similarity_score: 0.82,
      },
    ],
    groundedness_score: 0.91,
  },
  created_at: new Date().toISOString(),
};

// ── Analytics Response Mocks ────────────────────────────────────────

export const MOCK_ANALYTICS_RESPONSE: UnifiedQueryResponse = {
  id: "uq-analytics-001",
  intent_type: "analytics",
  confidence: 0.97,
  analytics_response: {
    sql: "SELECT DATE_TRUNC('month', date) AS month, SUM(revenue) AS total_revenue FROM sales_data GROUP BY month ORDER BY month",
    data: [
      { month: "2025-07", total_revenue: 125000 },
      { month: "2025-08", total_revenue: 142000 },
      { month: "2025-09", total_revenue: 138000 },
      { month: "2025-10", total_revenue: 156000 },
      { month: "2025-11", total_revenue: 171000 },
      { month: "2025-12", total_revenue: 189000 },
      { month: "2026-01", total_revenue: 162000 },
    ],
    chart_type: "bar",
    chart_config: {
      xKey: "month",
      yKey: "total_revenue",
      title: "Monthly Revenue",
      color: "#6366f1",
    },
    insights_text:
      "Monthly revenue has shown a steady upward trend, growing from $125K in July 2025 to $189K in December 2025 (+51.2%). " +
      "January 2026 saw a seasonal dip to $162K. The strongest month was December at $189K.",
  },
  created_at: new Date().toISOString(),
};

export const MOCK_ANALYTICS_TOP_CUSTOMERS: UnifiedQueryResponse = {
  id: "uq-analytics-002",
  intent_type: "analytics",
  confidence: 0.95,
  analytics_response: {
    sql: "SELECT customer, SUM(revenue) AS total_revenue, COUNT(*) AS order_count FROM sales_data GROUP BY customer ORDER BY total_revenue DESC LIMIT 5",
    data: [
      { customer: "Acme Corp", total_revenue: 245000, order_count: 28 },
      { customer: "TechStart Inc", total_revenue: 189000, order_count: 15 },
      { customer: "Global Systems", total_revenue: 167000, order_count: 22 },
      { customer: "DataFlow Ltd", total_revenue: 134000, order_count: 19 },
      { customer: "CloudNine SA", total_revenue: 112000, order_count: 12 },
    ],
    chart_type: "bar",
    chart_config: {
      xKey: "customer",
      yKey: "total_revenue",
      title: "Top 5 Customers by Revenue",
      color: "#10b981",
    },
    insights_text:
      "Acme Corp is the top customer with $245K in revenue across 28 orders. " +
      "The top 5 customers account for $847K total. TechStart Inc has the highest average order value at $12.6K per order.",
  },
  created_at: new Date().toISOString(),
};

// ── Ambiguous / Clarification Mock ──────────────────────────────────

export const MOCK_AMBIGUOUS_RESPONSE: UnifiedQueryResponse = {
  id: "uq-ambiguous-001",
  intent_type: "rag",
  confidence: 0.55,
  rag_response: {
    answer:
      "I wasn't entirely sure if you're asking about information from documents or data analytics. " +
      "Based on available documents, I found the following information about revenue:\n\n" +
      "The Q4 Financial Report mentions projected annual revenue of $2.1M with a 15% year-over-year growth target. " +
      "If you're looking for actual revenue data from the sales dataset, try asking something like " +
      '"Show me total revenue by month from the sales data."',
    sources: [
      {
        chunk_text:
          "Q4 Revenue Projections: Annual projected revenue of $2.1M with 15% YoY growth target.",
        document_id: "doc-003",
        document_name: "Q4_Financial_Report.pdf",
        similarity_score: 0.76,
      },
    ],
    groundedness_score: 0.72,
  },
  created_at: new Date().toISOString(),
};

/**
 * Match a mock unified query response based on query text.
 */
export function matchUnifiedQueryMock(query: string): UnifiedQueryResponse {
  const q = query.toLowerCase();

  // Analytics patterns
  if (
    q.includes("revenue by month") ||
    q.includes("monthly revenue") ||
    q.includes("每月") ||
    q.includes("总收入")
  ) {
    return MOCK_ANALYTICS_RESPONSE;
  }

  if (
    q.includes("top customer") ||
    q.includes("top 5") ||
    q.includes("top 10") ||
    q.includes("前10")
  ) {
    return MOCK_ANALYTICS_TOP_CUSTOMERS;
  }

  // RAG patterns
  if (
    q.includes("contract") ||
    q.includes("payment") ||
    q.includes("document") ||
    q.includes("合同") ||
    q.includes("what does")
  ) {
    return MOCK_RAG_RESPONSE;
  }

  // Default: ambiguous
  return MOCK_AMBIGUOUS_RESPONSE;
}
