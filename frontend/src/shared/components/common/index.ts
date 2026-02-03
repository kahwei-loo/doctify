/**
 * Common Components
 *
 * Exports all common utility components.
 */

export { ErrorBoundary } from './ErrorBoundary';

export { Loading } from './Loading';
export type { LoadingProps } from './Loading';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction } from './EmptyState';

// Error States
export { ErrorState, InlineError } from './ErrorState';
export type { ErrorStateProps, InlineErrorProps, ErrorType } from './ErrorState';

// Loading States
export {
  TableSkeleton,
  CardSkeleton,
  CardGridSkeleton,
  PageSkeleton,
  InlineLoading,
  FullPageLoading,
} from './LoadingStates';
export type { TableSkeletonColumn } from './LoadingStates';

// Progress
export {
  MultiStepProgress,
  SimpleProgress,
} from './Progress';
export type { Step, StepStatus } from './Progress';

// Command Palette (Global Search)
export { CommandPalette } from './CommandPalette';
export type { SearchResultType, SearchResult } from './CommandPalette';

// Transitions
export {
  FadeTransition,
  SlideTransition,
  ScaleTransition,
} from './Transition';

// Virtual List (Performance)
export {
  VirtualList,
  SimpleVirtualList,
  useVirtualListScroll,
} from './VirtualList';
