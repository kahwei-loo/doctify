/**
 * useDocumentProcessing Hook
 *
 * Custom hook for document processing operations including process start,
 * cancel, retry, and quality validation.
 */

import { useState, useCallback } from 'react';
import { documentApi } from '../services/api';
import type { QualityValidation } from '../types';

interface UseDocumentProcessingReturn {
  isProcessing: boolean;
  error: string | null;
  qualityValidation: QualityValidation | null;
  processDocument: (documentId: string, extractionConfig?: Record<string, any>) => Promise<void>;
  cancelProcessing: (documentId: string) => Promise<void>;
  retryProcessing: (documentId: string) => Promise<void>;
  validateQuality: (documentId: string, minimumConfidence?: number) => Promise<QualityValidation>;
  clearError: () => void;
}

export const useDocumentProcessing = (): UseDocumentProcessingReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityValidation, setQualityValidation] = useState<QualityValidation | null>(null);

  /**
   * Start document processing
   */
  const processDocument = useCallback(
    async (documentId: string, extractionConfig?: Record<string, any>) => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await documentApi.process(documentId, extractionConfig);

        if (!response.success) {
          throw new Error(response.message || 'Processing failed');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to start processing';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Cancel document processing
   */
  const cancelProcessing = useCallback(async (documentId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await documentApi.cancel(documentId);

      if (!response.success) {
        throw new Error(response.message || 'Cancellation failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to cancel processing';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Retry failed document processing
   */
  const retryProcessing = useCallback(async (documentId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await documentApi.retry(documentId);

      if (!response.success) {
        throw new Error(response.message || 'Retry failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to retry processing';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Validate extraction quality
   */
  const validateQuality = useCallback(
    async (documentId: string, minimumConfidence = 0.75): Promise<QualityValidation> => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await documentApi.validateQuality(documentId, minimumConfidence);

        if (!response.success) {
          throw new Error('Quality validation failed');
        }

        setQualityValidation(response.data);
        return response.data;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to validate quality';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    qualityValidation,
    processDocument,
    cancelProcessing,
    retryProcessing,
    validateQuality,
    clearError,
  };
};
