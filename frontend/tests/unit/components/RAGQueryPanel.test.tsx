/**
 * RAGQueryPanel Component Tests
 *
 * Unit tests for RAG query panel component.
 * Phase 11 - RAG Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RAGQueryPanel } from '@/features/rag/components/RAGQueryPanel';
import { api } from '@/store/api/apiSlice';

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });
};

describe('RAGQueryPanel', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
  });

  it('renders question input and submit button', () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask question/i })).toBeInTheDocument();
  });

  it('updates question state when typing', () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(input, { target: { value: 'What is AI?' } });

    expect(input).toHaveValue('What is AI?');
  });

  it('disables submit button when question is empty', () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const submitButton = screen.getByRole('button', { name: /ask question/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when question is entered', () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: 'What is AI?' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state when submitting query', async () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: 'What is AI?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });

  it('clears input after successful query', async () => {
    const mockOnComplete = vi.fn();

    render(
      <Provider store={store}>
        <RAGQueryPanel onQueryComplete={mockOnComplete} />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i) as HTMLTextAreaElement;
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: 'What is AI?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('calls onQueryComplete callback with response', async () => {
    const mockOnComplete = vi.fn();
    const mockResponse = {
      id: '123',
      question: 'What is AI?',
      answer: 'Artificial Intelligence is...',
      sources: [],
      model_used: 'gpt-4',
      tokens_used: 100,
      confidence_score: 0.85,
      created_at: new Date().toISOString(),
    };

    // Mock the mutation
    vi.spyOn(store.dispatch as any, 'queryDocuments').mockResolvedValue({
      data: mockResponse,
    });

    render(
      <Provider store={store}>
        <RAGQueryPanel onQueryComplete={mockOnComplete} />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: 'What is AI?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('displays error message when query fails', async () => {
    // Mock failed mutation
    vi.spyOn(store.dispatch as any, 'queryDocuments').mockRejectedValue({
      data: { detail: 'Query failed' },
    });

    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: 'What is AI?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to process query/i)).toBeInTheDocument();
    });
  });

  it('disables input and button during loading', async () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: 'What is AI?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  it('prevents submission when question is only whitespace', () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: '   ' } });

    expect(submitButton).toBeDisabled();
  });

  it('trims whitespace from question before submission', async () => {
    const mockOnComplete = vi.fn();

    render(
      <Provider store={store}>
        <RAGQueryPanel onQueryComplete={mockOnComplete} />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /ask question/i });

    fireEvent.change(input, { target: { value: '  What is AI?  ' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const calls = (store.dispatch as any).mock.calls;
      const queryCall = calls.find(
        (call: any) => call[0]?.type === 'api/executeQuery/pending'
      );
      expect(queryCall[0].meta.arg.originalArgs.question).toBe('What is AI?');
    });
  });

  it('handles keyboard shortcuts (Enter to submit)', () => {
    const mockOnComplete = vi.fn();

    render(
      <Provider store={store}>
        <RAGQueryPanel onQueryComplete={mockOnComplete} />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);

    fireEvent.change(input, { target: { value: 'What is AI?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Verify form submission triggered
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('allows Shift+Enter for newlines without submitting', () => {
    render(
      <Provider store={store}>
        <RAGQueryPanel />
      </Provider>
    );

    const input = screen.getByPlaceholderText(/ask a question/i);

    fireEvent.change(input, { target: { value: 'Line 1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    // Should not submit, verify input still has value
    expect(input).toHaveValue('Line 1');
  });
});
