/**
 * QAPairsContent — expanded view for Q&A pairs data sources.
 */

import React from "react";
import type { DataSource } from "../../types";

interface QAPairsContentProps {
  source: DataSource;
}

export const QAPairsContent: React.FC<QAPairsContentProps> = ({ source }) => {
  const pairs = source.config.qa_pairs || [];

  if (pairs.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No Q&A pairs</p>;
  }

  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={pair.id || i} className="rounded-lg border bg-card p-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
              Q
            </span>
            <p className="text-sm font-medium">{pair.question}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
              A
            </span>
            <p className="text-sm text-muted-foreground">{pair.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
