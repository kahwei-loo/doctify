/**
 * Onboarding constants
 *
 * Step definitions for the demo onboarding flow.
 */

import { Upload, Sparkles, Database, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface OnboardingStep {
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Upload Documents',
    description: 'Start by uploading your documents for AI processing.',
    detail: 'Supports multiple formats: PDF, PNG, JPG, and TIFF. Drag and drop or browse to upload.',
    icon: Upload,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'AI-Powered Extraction',
    description: 'Documents are processed by a multi-AI pipeline.',
    detail: 'GPT-4V, Claude, and Gemini work together with automatic fallback for maximum accuracy.',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Build Knowledge Bases',
    description: 'Organize extracted data into searchable collections.',
    detail: 'Vector embeddings with pgvector enable semantic search. Cohere reranking improves relevance.',
    icon: Database,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Ask Questions',
    description: 'Query your documents with RAG-powered AI answers.',
    detail: 'Get answers grounded in your sources with citation links and groundedness verification.',
    icon: MessageSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
];

export const ONBOARDING_STORAGE_KEY = 'doctify_onboarding_completed';
