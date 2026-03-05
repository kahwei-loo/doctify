/**
 * EmptyKBState Component
 *
 * Empty state when no knowledge bases exist.
 *
 * Features:
 * - Friendly illustration
 * - Clear call-to-action
 * - Helpful description
 */

import React from "react";
import { Database, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyKBStateProps {
  onCreateKB?: () => void;
  className?: string;
}

export const EmptyKBState: React.FC<EmptyKBStateProps> = ({ onCreateKB, className }) => {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-6">
          <Database className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Knowledge Bases Yet</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Create your first knowledge base to start organizing and searching your content with
          AI-powered semantic search.
        </p>
        {onCreateKB && (
          <Button onClick={onCreateKB} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Your First Knowledge Base
          </Button>
        )}
        <div className="mt-8 text-sm text-muted-foreground max-w-lg">
          <p className="mb-2 font-medium">What you can do with Knowledge Bases:</p>
          <ul className="space-y-1 text-left">
            <li>• Upload documents and extract knowledge automatically</li>
            <li>• Crawl websites to index content</li>
            <li>• Add Q&A pairs for FAQ-style knowledge</li>
            <li>• Perform semantic search to find relevant information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyKBState;
