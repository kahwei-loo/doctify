/**
 * QueryFeedback Component
 *
 * Inline thumbs up/down feedback for unified query responses.
 * On negative feedback, offers intent correction (wrong pipeline routing).
 *
 * Part of Unified Knowledge & Insights integration.
 */

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubmitUnifiedFeedbackMutation } from "@/store/api/ragApi";

interface QueryFeedbackProps {
  queryId: string;
  intentType: "rag" | "analytics";
  className?: string;
}

export const QueryFeedback: React.FC<QueryFeedbackProps> = ({ queryId, intentType, className }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [showIntentCorrection, setShowIntentCorrection] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [submitFeedback, { isLoading }] = useSubmitUnifiedFeedbackMutation();

  const handleRating = async (value: number) => {
    setRating(value);

    if (value <= 2) {
      setShowIntentCorrection(true);
    } else {
      await submitFeedback({
        queryId,
        feedback: { rating: value },
      });
      setSubmitted(true);
    }
  };

  const handleIntentCorrection = async (correctIntent?: "rag" | "analytics") => {
    await submitFeedback({
      queryId,
      feedback: {
        rating: rating!,
        ...(correctIntent ? { correct_intent: correctIntent } : {}),
      },
    });
    setSubmitted(true);
    setShowIntentCorrection(false);
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Check className="h-3.5 w-3.5 text-green-500" />
        Thanks for your feedback
      </div>
    );
  }

  const oppositeIntent = intentType === "rag" ? "analytics" : "rag";
  const oppositeLabel = oppositeIntent === "rag" ? "Document Q&A" : "Data Analytics";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Was this helpful?</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", rating === 5 && "bg-green-50 text-green-600")}
            onClick={() => handleRating(5)}
            disabled={isLoading}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", rating !== null && rating <= 2 && "bg-red-50 text-red-600")}
            onClick={() => handleRating(1)}
            disabled={isLoading}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showIntentCorrection && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Should this have been</span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => handleIntentCorrection(oppositeIntent)}
            disabled={isLoading}
          >
            {oppositeLabel}
          </Button>
          <span className="text-muted-foreground">instead?</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => handleIntentCorrection()}
            disabled={isLoading}
          >
            No, skip
          </Button>
        </div>
      )}
    </div>
  );
};

export default QueryFeedback;
