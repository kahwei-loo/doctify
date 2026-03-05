/**
 * WebsiteContent — expanded view for website crawler data sources.
 */

import React from "react";
import { Globe, ExternalLink, Loader2 } from "lucide-react";

import type { DataSource } from "../../types";

interface WebsiteContentProps {
  source: DataSource;
}

export const WebsiteContent: React.FC<WebsiteContentProps> = ({ source }) => {
  const { url, max_depth, pages_crawled, total_pages } = source.config;

  return (
    <div className="space-y-3">
      {/* URL */}
      {url && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-orange-600 shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </div>
      )}

      {/* Crawl Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-bold">{pages_crawled || 0}</p>
          <p className="text-xs text-muted-foreground">Pages Crawled</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-bold">{max_depth || 1}</p>
          <p className="text-xs text-muted-foreground">Max Depth</p>
        </div>
      </div>

      {/* Crawl Status */}
      {source.status === "syncing" && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Crawling in progress...
        </div>
      )}

      {total_pages !== undefined && (
        <p className="text-xs text-muted-foreground">
          {pages_crawled || 0} / {total_pages} pages crawled
        </p>
      )}
    </div>
  );
};
