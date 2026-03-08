/**
 * RAGResponseCard Component Tests
 *
 * Unit tests for RAG response card component.
 * Phase 11 - RAG Implementation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { RAGResponseCard } from "@/features/rag/components/RAGResponseCard";
import { api } from "@/store/api/apiSlice";
import type { RAGQueryResponse } from "@/store/api/ragApi";

// Mock the feedback mutation hook at module level
const mockSubmitFeedback = vi.fn();

vi.mock("@/store/api/ragApi", async () => {
  const actual = await vi.importActual("@/store/api/ragApi");
  return {
    ...actual,
    useSubmitRAGFeedbackMutation: () => [mockSubmitFeedback, { isLoading: false }],
  };
});

const createMockStore = () => {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  });
};

const mockResponse: RAGQueryResponse = {
  id: "123",
  question: "What is artificial intelligence?",
  answer:
    "Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems.",
  sources: [
    {
      chunk_text: "AI involves machine learning and neural networks...",
      document_id: "doc-1",
      document_name: "AI Basics.pdf",
      document_title: "Introduction to AI",
      chunk_index: 0,
      similarity_score: 0.92,
    },
    {
      chunk_text: "Deep learning is a subset of machine learning...",
      document_id: "doc-2",
      document_name: "Deep Learning.pdf",
      document_title: null,
      chunk_index: 5,
      similarity_score: 0.85,
    },
  ],
  model_used: "gpt-4",
  tokens_used: 250,
  confidence_score: 0.88,
  context_used: 2,
  created_at: "2024-01-20T10:30:00Z",
};

describe("RAGResponseCard", () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
    // Default: feedback resolves successfully
    mockSubmitFeedback.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
  });

  it("renders question and answer", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    expect(screen.getByText(mockResponse.question)).toBeInTheDocument();
    expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
  });

  it("displays metadata badges", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    expect(screen.getByText("88% confidence")).toBeInTheDocument();
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("250 tokens")).toBeInTheDocument();
  });

  it("shows sources count in button", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    expect(screen.getByText(/View Sources \(2\)/i)).toBeInTheDocument();
  });

  it("toggles sources visibility when button clicked", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    const sourcesButton = screen.getByText(/View Sources/i);

    // Initially sources should not be visible
    expect(screen.queryByText("AI Basics.pdf")).not.toBeInTheDocument();

    // Click to show sources
    fireEvent.click(sourcesButton);

    expect(screen.getByText("AI Basics.pdf")).toBeInTheDocument();
    expect(screen.getByText("Deep Learning.pdf")).toBeInTheDocument();

    // Click to hide sources
    fireEvent.click(screen.getByText(/Hide Sources/i));

    expect(screen.queryByText("AI Basics.pdf")).not.toBeInTheDocument();
  });

  it("displays source details correctly", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    const sourcesButton = screen.getByText(/View Sources/i);
    fireEvent.click(sourcesButton);

    // Check first source
    expect(screen.getByText("AI Basics.pdf")).toBeInTheDocument();
    expect(screen.getByText("(Introduction to AI)")).toBeInTheDocument();
    expect(screen.getByText("92% match")).toBeInTheDocument();
    expect(screen.getByText(/Chunk 1/i)).toBeInTheDocument();

    // Check second source
    expect(screen.getByText("Deep Learning.pdf")).toBeInTheDocument();
    expect(screen.getByText("85% match")).toBeInTheDocument();
    expect(screen.getByText(/Chunk 6/i)).toBeInTheDocument();
  });

  it("handles sources without document_title", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    const sourcesButton = screen.getByText(/View Sources/i);
    fireEvent.click(sourcesButton);

    // Second source has no title, should still render
    expect(screen.getByText("Deep Learning.pdf")).toBeInTheDocument();
    expect(screen.queryByText("(null)")).not.toBeInTheDocument();
  });

  it("displays feedback buttons", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    expect(screen.getByText(/Was this helpful\?/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button")
        .filter(
          (btn) =>
            btn.querySelector("svg") &&
            (btn.textContent === "" || btn.textContent?.includes("thumb"))
        )
    ).toHaveLength(2);
  });

  it("submits positive feedback", async () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    const thumbsUpButton = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg")?.classList.contains("lucide-thumbs-up"));

    fireEvent.click(thumbsUpButton!);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        queryId: mockResponse.id,
        feedback: { rating: 5 },
      });
    });
  });

  it("submits negative feedback", async () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    const thumbsDownButton = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg")?.classList.contains("lucide-thumbs-down"));

    fireEvent.click(thumbsDownButton!);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        queryId: mockResponse.id,
        feedback: { rating: 1 },
      });
    });
  });

  it("disables feedback buttons after submission", async () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    const thumbsUpButton = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg")?.classList.contains("lucide-thumbs-up"));

    fireEvent.click(thumbsUpButton!);

    await waitFor(() => {
      const feedbackButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) =>
            btn.querySelector(".lucide-thumbs-up") || btn.querySelector(".lucide-thumbs-down")
        );
      feedbackButtons.forEach((btn) => expect(btn).toBeDisabled());
    });
  });

  it("displays context_used count", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    expect(screen.getByText("2 chunks used for context")).toBeInTheDocument();
  });

  it("formats confidence score as percentage", () => {
    render(
      <Provider store={store}>
        <RAGResponseCard response={mockResponse} />
      </Provider>
    );

    expect(screen.getByText("88% confidence")).toBeInTheDocument();
  });

  it("handles response with no sources", () => {
    const responseNoSources = { ...mockResponse, sources: [], context_used: 0 };

    render(
      <Provider store={store}>
        <RAGResponseCard response={responseNoSources} />
      </Provider>
    );

    expect(screen.queryByText(/View Sources/i)).not.toBeInTheDocument();
    expect(screen.getByText("0 chunks used for context")).toBeInTheDocument();
  });

  it("displays formatted timestamp", () => {
    // Use a recent date so formatQueryDate returns relative time (e.g., "5m ago")
    const recentResponse = {
      ...mockResponse,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    };
    render(
      <Provider store={store}>
        <RAGResponseCard response={recentResponse} />
      </Provider>
    );

    const timestamp = screen.getByText(/ago|Just now/i);
    expect(timestamp).toBeInTheDocument();
  });
});
