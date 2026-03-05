/**
 * MultiStepProgress Component
 *
 * A progress indicator for multi-step operations like document processing,
 * vectorization, or file uploads.
 */

import React from "react";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "in-progress" | "completed" | "error";

export interface Step {
  /** Unique identifier for the step */
  id: string;
  /** Display label for the step */
  label: string;
  /** Current status of the step */
  status: StepStatus;
  /** Optional description or error message */
  description?: string;
}

interface MultiStepProgressProps {
  /** Array of steps to display */
  steps: Step[];
  /** Index of the current step (0-based) */
  currentStep?: number;
  /** Whether to show percentage */
  showPercentage?: boolean;
  /** Overall progress percentage (0-100) */
  percentage?: number;
  /** Layout orientation */
  orientation?: "horizontal" | "vertical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

const statusIcons: Record<StepStatus, React.FC<{ className?: string }>> = {
  pending: ({ className }) => <Circle className={cn("h-4 w-4 text-muted-foreground", className)} />,
  "in-progress": ({ className }) => (
    <Loader2 className={cn("h-4 w-4 animate-spin text-primary", className)} />
  ),
  completed: ({ className }) => <Check className={cn("h-4 w-4 text-green-500", className)} />,
  error: ({ className }) => <AlertCircle className={cn("h-4 w-4 text-destructive", className)} />,
};

const statusColors: Record<StepStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary border-primary",
  completed:
    "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-500",
  error: "bg-destructive/20 text-destructive border-destructive",
};

const sizeConfig = {
  sm: {
    icon: "h-6 w-6",
    iconInner: "h-3 w-3",
    text: "text-xs",
    gap: "gap-2",
  },
  md: {
    icon: "h-8 w-8",
    iconInner: "h-4 w-4",
    text: "text-sm",
    gap: "gap-3",
  },
  lg: {
    icon: "h-10 w-10",
    iconInner: "h-5 w-5",
    text: "text-base",
    gap: "gap-4",
  },
};

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep,
  showPercentage = false,
  percentage,
  orientation = "horizontal",
  size = "md",
  className,
}) => {
  const config = sizeConfig[size];
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const calculatedPercentage = percentage ?? Math.round((completedSteps / steps.length) * 100);

  if (orientation === "vertical") {
    return (
      <div className={cn("space-y-4", className)}>
        {showPercentage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn("font-medium", config.text)}>Progress</span>
              <span className={cn("text-muted-foreground", config.text)}>
                {calculatedPercentage}%
              </span>
            </div>
            <Progress value={calculatedPercentage} className="h-2" />
          </div>
        )}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const StatusIcon = statusIcons[step.status];
            const isActive = currentStep === index;
            return (
              <div
                key={step.id}
                className={cn("flex items-start", config.gap, isActive && "font-medium")}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2",
                    config.icon,
                    statusColors[step.status]
                  )}
                >
                  <StatusIcon className={config.iconInner} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className={cn(config.text, "font-medium")}>{step.label}</p>
                  {step.description && (
                    <p
                      className={cn(
                        "text-muted-foreground mt-0.5",
                        size === "sm" ? "text-xs" : "text-sm"
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={cn("space-y-4", className)}>
      {showPercentage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("font-medium", config.text)}>Progress</span>
            <span className={cn("text-muted-foreground", config.text)}>
              {calculatedPercentage}%
            </span>
          </div>
          <Progress value={calculatedPercentage} className="h-2" />
        </div>
      )}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StatusIcon = statusIcons[step.status];
          const isLast = index === steps.length - 1;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2",
                    config.icon,
                    statusColors[step.status]
                  )}
                >
                  <StatusIcon className={config.iconInner} />
                </div>
                <span
                  className={cn(
                    "mt-2 text-center max-w-[80px]",
                    config.text,
                    step.status === "in-progress" && "font-medium"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    step.status === "completed" ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * SimpleProgress Component
 *
 * A simpler progress indicator with just a bar and optional text.
 */
interface SimpleProgressProps {
  /** Progress value (0-100) */
  value: number;
  /** Label text */
  label?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Progress bar variant */
  variant?: "default" | "success" | "warning" | "error";
  /** Additional class names */
  className?: string;
}

const variantColors = {
  default: "",
  success: "[&>div]:bg-green-500",
  warning: "[&>div]:bg-yellow-500",
  error: "[&>div]:bg-destructive",
};

export const SimpleProgress: React.FC<SimpleProgressProps> = ({
  value,
  label,
  showPercentage = true,
  variant = "default",
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && <span className="font-medium">{Math.round(value)}%</span>}
        </div>
      )}
      <Progress value={value} className={cn("h-2", variantColors[variant])} />
    </div>
  );
};

export default MultiStepProgress;
