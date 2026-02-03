/**
 * WebsiteCrawlerSource Component
 *
 * Configure website crawling for knowledge base.
 *
 * Features:
 * - URL input with validation
 * - Max depth selector
 * - Include/exclude patterns
 * - Crawl progress display
 */

import React, { useState } from 'react';
import { Globe, Plus, X, Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WebsiteCrawlerSourceProps {
  url?: string;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  onChange: (config: {
    url: string;
    maxDepth: number;
    includePatterns: string[];
    excludePatterns: string[];
  }) => void;
  onStartCrawl?: () => void;
  crawling?: boolean;
  crawlProgress?: {
    pagesCrawled: number;
    totalPages: number;
  };
  className?: string;
}

export const WebsiteCrawlerSource: React.FC<WebsiteCrawlerSourceProps> = ({
  url = '',
  maxDepth = 2,
  includePatterns = [],
  excludePatterns = [],
  onChange,
  onStartCrawl,
  crawling = false,
  crawlProgress,
  className,
}) => {
  const [newIncludePattern, setNewIncludePattern] = useState('');
  const [newExcludePattern, setNewExcludePattern] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setUrlError('URL is required');
      return false;
    }
    try {
      const urlObj = new URL(value);
      if (!urlObj.protocol.startsWith('http')) {
        setUrlError('URL must start with http:// or https://');
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Invalid URL format');
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    validateUrl(value);
    onChange({ url: value, maxDepth, includePatterns, excludePatterns });
  };

  const handleMaxDepthChange = (value: string) => {
    onChange({ url, maxDepth: parseInt(value), includePatterns, excludePatterns });
  };

  const handleAddIncludePattern = () => {
    if (newIncludePattern.trim()) {
      onChange({
        url,
        maxDepth,
        includePatterns: [...includePatterns, newIncludePattern.trim()],
        excludePatterns,
      });
      setNewIncludePattern('');
    }
  };

  const handleRemoveIncludePattern = (pattern: string) => {
    onChange({
      url,
      maxDepth,
      includePatterns: includePatterns.filter((p) => p !== pattern),
      excludePatterns,
    });
  };

  const handleAddExcludePattern = () => {
    if (newExcludePattern.trim()) {
      onChange({
        url,
        maxDepth,
        includePatterns,
        excludePatterns: [...excludePatterns, newExcludePattern.trim()],
      });
      setNewExcludePattern('');
    }
  };

  const handleRemoveExcludePattern = (pattern: string) => {
    onChange({
      url,
      maxDepth,
      includePatterns,
      excludePatterns: excludePatterns.filter((p) => p !== pattern),
    });
  };

  const canStartCrawl = url.trim() && !urlError && !crawling;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Website Crawler</h3>
        <p className="text-sm text-muted-foreground">
          Automatically crawl and index content from websites
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="website-url">Website URL *</Label>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Input
              id="website-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={crawling}
              className={cn(urlError && 'border-destructive')}
            />
            {urlError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the starting URL to crawl (e.g., https://docs.example.com)
        </p>
      </div>

      {/* Max Depth */}
      <div className="space-y-2">
        <Label htmlFor="max-depth">Maximum Crawl Depth</Label>
        <Select
          value={maxDepth.toString()}
          onValueChange={handleMaxDepthChange}
          disabled={crawling}
        >
          <SelectTrigger id="max-depth">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 level (direct links only)</SelectItem>
            <SelectItem value="2">2 levels (recommended)</SelectItem>
            <SelectItem value="3">3 levels (thorough)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How deep to follow links from the starting URL (depth 2 = ~50-100 pages)
        </p>
      </div>

      {/* Include Patterns */}
      <div className="space-y-2">
        <Label>Include Patterns (optional)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="/docs/*, /guides/*"
            value={newIncludePattern}
            onChange={(e) => setNewIncludePattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddIncludePattern();
              }
            }}
            disabled={crawling}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddIncludePattern}
            disabled={!newIncludePattern.trim() || crawling}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {includePatterns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {includePatterns.map((pattern) => (
              <Badge key={pattern} variant="secondary" className="gap-1">
                {pattern}
                <button
                  onClick={() => handleRemoveIncludePattern(pattern)}
                  className="ml-1 hover:text-destructive"
                  disabled={crawling}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Only crawl URLs matching these patterns (e.g., /api/*, /guides/*)
        </p>
      </div>

      {/* Exclude Patterns */}
      <div className="space-y-2">
        <Label>Exclude Patterns (optional)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="/blog/*, /changelog"
            value={newExcludePattern}
            onChange={(e) => setNewExcludePattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddExcludePattern();
              }
            }}
            disabled={crawling}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddExcludePattern}
            disabled={!newExcludePattern.trim() || crawling}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {excludePatterns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludePatterns.map((pattern) => (
              <Badge key={pattern} variant="secondary" className="gap-1">
                {pattern}
                <button
                  onClick={() => handleRemoveExcludePattern(pattern)}
                  className="ml-1 hover:text-destructive"
                  disabled={crawling}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Skip URLs matching these patterns (e.g., /changelog, /blog/*)
        </p>
      </div>

      {/* Crawl Progress */}
      {crawlProgress && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-medium">Crawling in progress...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {crawlProgress.pagesCrawled} / {crawlProgress.totalPages} pages
                </span>
              </div>
              <Progress
                value={(crawlProgress.pagesCrawled / crawlProgress.totalPages) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Crawl Button */}
      {onStartCrawl && (
        <div className="flex justify-end">
          <Button
            onClick={onStartCrawl}
            disabled={!canStartCrawl}
            className="gap-2"
          >
            {crawling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Crawl
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 shrink-0">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-medium">MVP Limitations</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Single domain only (no cross-domain crawling)</li>
                <li>• No JavaScript rendering (static HTML only)</li>
                <li>• Maximum 100 pages per crawl</li>
                <li>• 30 second timeout per page</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteCrawlerSource;
