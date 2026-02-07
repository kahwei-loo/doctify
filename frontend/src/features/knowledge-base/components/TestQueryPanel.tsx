/**
 * TestQueryPanel Component
 *
 * Test semantic search queries against knowledge base.
 *
 * Features:
 * - Query input textarea
 * - Top-K results selector
 * - Results display with similarity scores
 * - Result highlighting
 */

import React, { useState } from 'react';
import { Search, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type SearchMode = 'semantic' | 'keyword' | 'hybrid';

interface QueryResult {
  text: string;
  similarity: number;
  source_name?: string;
  chunk_index?: number;
  search_mode?: string;
}

interface TestQueryPanelProps {
  knowledgeBaseId: string;
  embeddingCount: number;
  onQuery?: (query: string, topK: number, searchMode?: SearchMode) => Promise<QueryResult[]>;
  className?: string;
}

export const TestQueryPanel: React.FC<TestQueryPanelProps> = ({
  knowledgeBaseId,
  embeddingCount,
  onQuery,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState('5');
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (embeddingCount === 0) {
      setError('No embeddings available. Please generate embeddings first.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Mock search results (Week 2)
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay

      const mockResults: QueryResult[] = [
        {
          text: 'This is a sample text chunk that matches your query. It contains relevant information about the topic you searched for.',
          similarity: 0.92,
          source_name: 'User Guide.pdf',
          chunk_index: 5,
        },
        {
          text: 'Another relevant chunk with slightly lower similarity score. This also contains information related to your search.',
          similarity: 0.87,
          source_name: 'Technical Documentation',
          chunk_index: 12,
        },
        {
          text: 'Third result with moderate similarity. The content is somewhat related to your query but not as strongly matched.',
          similarity: 0.78,
          source_name: 'FAQ Document',
          chunk_index: 3,
        },
        {
          text: 'Fourth result with lower similarity score. This might be tangentially related to your search query.',
          similarity: 0.65,
          source_name: 'User Guide.pdf',
          chunk_index: 18,
        },
        {
          text: 'Fifth result with the lowest similarity among top results. Still potentially relevant but weaker match.',
          similarity: 0.58,
          source_name: 'Getting Started',
          chunk_index: 7,
        },
      ];

      const limitedResults = mockResults.slice(0, parseInt(topK));
      setResults(limitedResults);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (similarity >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSimilarityBadge = (similarity: number): string => {
    if (similarity >= 0.8) return 'High Match';
    if (similarity >= 0.6) return 'Medium Match';
    return 'Low Match';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Test Query</h3>
        <p className="text-sm text-muted-foreground">
          Test semantic search to find relevant content
        </p>
      </div>

      {/* Query Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="query">Search Query</Label>
          <Textarea
            id="query"
            placeholder="Enter your search query here... For example: 'How do I configure authentication?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            disabled={isSearching}
          />
          <p className="text-xs text-muted-foreground">
            Enter a natural language question or keywords to search
          </p>
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 max-w-[160px] space-y-2">
            <Label htmlFor="top-k">Number of Results</Label>
            <Select value={topK} onValueChange={setTopK} disabled={isSearching}>
              <SelectTrigger id="top-k">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Top 3 results</SelectItem>
                <SelectItem value="5">Top 5 results</SelectItem>
                <SelectItem value="10">Top 10 results</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 max-w-[180px] space-y-2">
            <Label htmlFor="search-mode">Search Mode</Label>
            <Select
              value={searchMode}
              onValueChange={(v) => setSearchMode(v as SearchMode)}
              disabled={isSearching}
            >
              <SelectTrigger id="search-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="semantic">Semantic</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Search Results</h4>
            <Badge variant="outline">{results.length} results found</Badge>
          </div>

          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className={cn('border-2', getSimilarityColor(result.similarity))}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Result Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                          #{index + 1}
                        </Badge>
                        <Badge variant="outline">{getSimilarityBadge(result.similarity)}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {(result.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                    </div>

                    {/* Text Content */}
                    <p className="text-sm leading-relaxed">{result.text}</p>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {result.source_name && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Source:</span> {result.source_name}
                        </span>
                      )}
                      {result.chunk_index !== undefined && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Chunk:</span> {result.chunk_index}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && results.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="text-lg font-medium mb-2">No Search Results Yet</h4>
            <p className="text-sm text-muted-foreground max-w-md">
              Enter a query above and click Search to test semantic search on your knowledge base
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10 shrink-0">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-medium">Semantic Search</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Uses AI embeddings to understand meaning, not just keywords</li>
                <li>• Finds relevant content even with different wording</li>
                <li>• Similarity scores show how closely results match your query</li>
                <li>• Higher scores (&gt;80%) indicate strong semantic matches</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestQueryPanel;
