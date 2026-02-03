import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Get color class based on confidence value
 * 0-50%: red, 51-70%: orange, 71-85%: yellow, 86-100%: green
 */
const getConfidenceColor = (value: number): string => {
  if (value <= 50) return 'bg-red-500';
  if (value <= 70) return 'bg-orange-500';
  if (value <= 85) return 'bg-yellow-500';
  return 'bg-green-500';
};

/**
 * Get text color class based on confidence value
 */
const getConfidenceTextColor = (value: number): string => {
  if (value <= 50) return 'text-red-600';
  if (value <= 70) return 'text-orange-600';
  if (value <= 85) return 'text-yellow-600';
  return 'text-green-600';
};

const confidenceBarVariants = cva('rounded-full bg-muted overflow-hidden', {
  variants: {
    size: {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface ConfidenceBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof confidenceBarVariants> {
  /** Confidence value (0-100) */
  value: number;
  /** Whether to show percentage label */
  showLabel?: boolean;
  /** Label position */
  labelPosition?: 'left' | 'right' | 'inline';
}

const ConfidenceBar = React.forwardRef<HTMLDivElement, ConfidenceBarProps>(
  (
    {
      className,
      value,
      size,
      showLabel = false,
      labelPosition = 'right',
      ...props
    },
    ref
  ) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, value));
    const colorClass = getConfidenceColor(clampedValue);
    const textColorClass = getConfidenceTextColor(clampedValue);

    const bar = (
      <div
        ref={ref}
        className={cn(confidenceBarVariants({ size, className }))}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', colorClass)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );

    if (!showLabel) {
      return bar;
    }

    const label = (
      <span className={cn('text-xs font-medium tabular-nums', textColorClass)}>
        {clampedValue.toFixed(0)}%
      </span>
    );

    if (labelPosition === 'inline') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1">{bar}</div>
          {label}
        </div>
      );
    }

    if (labelPosition === 'left') {
      return (
        <div className="flex items-center gap-2">
          {label}
          <div className="flex-1">{bar}</div>
        </div>
      );
    }

    // Default: right
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">{bar}</div>
        {label}
      </div>
    );
  }
);
ConfidenceBar.displayName = 'ConfidenceBar';

export {
  ConfidenceBar,
  confidenceBarVariants,
  getConfidenceColor,
  getConfidenceTextColor,
};
