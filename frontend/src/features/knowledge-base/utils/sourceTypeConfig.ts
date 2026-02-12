/**
 * Source Type Configuration
 *
 * Central config for all 5 data source types: colors, icons, labels, metadata extraction.
 * Replaces scattered type-checking logic across components.
 */

import {
  FileStack,
  Globe,
  FileText,
  MessageSquare,
  Database,
  type LucideIcon,
} from 'lucide-react';
import type { DataSource, DataSourceType } from '../types';

export interface SourceTypeConfig {
  icon: LucideIcon;
  label: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  getMetadata: (source: DataSource) => string;
  getPreview: (source: DataSource) => string;
}

const sourceTypeConfigs: Record<DataSourceType, SourceTypeConfig> = {
  uploaded_docs: {
    icon: FileStack,
    label: 'Uploaded Documents',
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    getMetadata: (source) => {
      const docCount = source.document_count || source.config.document_ids?.length || 0;
      const embCount = source.embedding_count || 0;
      return embCount > 0 ? `${docCount} doc${docCount !== 1 ? 's' : ''} \u00B7 ${embCount} chunks` : `${docCount} doc${docCount !== 1 ? 's' : ''}`;
    },
    getPreview: (source) => {
      const docs = source.config.documents || [];
      if (docs.length > 0) {
        return docs.slice(0, 3).map((d) => d.filename).join(', ') +
          (docs.length > 3 ? ` +${docs.length - 3} more` : '');
      }
      return '';
    },
  },
  qa_pairs: {
    icon: MessageSquare,
    label: 'Q&A Pairs',
    borderColor: 'border-l-purple-500',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    getMetadata: (source) => {
      const count = source.config.qa_pairs?.length || 0;
      return `${count} pair${count !== 1 ? 's' : ''}`;
    },
    getPreview: (source) => {
      const pairs = source.config.qa_pairs || [];
      if (pairs.length > 0) {
        return `Q: ${pairs[0].question}`;
      }
      return '';
    },
  },
  text: {
    icon: FileText,
    label: 'Text Input',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    getMetadata: (_source) => {
      return 'Text';
    },
    getPreview: (source) => {
      const content = source.config.content || '';
      return content.slice(0, 120) + (content.length > 120 ? '...' : '');
    },
  },
  website: {
    icon: Globe,
    label: 'Website',
    borderColor: 'border-l-orange-500',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
    getMetadata: (source) => {
      const pages = source.config.pages_crawled || 0;
      return pages > 0 ? `${pages} page${pages !== 1 ? 's' : ''}` : 'No pages';
    },
    getPreview: (source) => {
      return source.config.url || '';
    },
  },
  structured_data: {
    icon: Database,
    label: 'Structured Data',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    getMetadata: (source) => {
      const info = source.config.file_info;
      if (!info) return '';
      return `${info.row_count?.toLocaleString() || 0} rows \u00B7 ${info.column_count || 0} columns`;
    },
    getPreview: (source) => {
      const info = source.config.file_info;
      return info?.filename || '';
    },
  },
};

export function getSourceTypeConfig(type: DataSourceType): SourceTypeConfig {
  return sourceTypeConfigs[type];
}

export function isEditableType(type: DataSourceType): boolean {
  return type !== 'uploaded_docs' && type !== 'structured_data';
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
