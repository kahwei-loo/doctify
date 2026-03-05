/**
 * TextContent — expanded view for text input data sources.
 */

import React from "react";
import type { DataSource } from "../../types";

interface TextContentProps {
  source: DataSource;
}

export const TextContent: React.FC<TextContentProps> = ({ source }) => {
  const content = source.config.content || "";

  if (!content) {
    return <p className="text-sm text-muted-foreground italic">No text content</p>;
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
};
