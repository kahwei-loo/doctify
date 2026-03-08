/**
 * TextInputSource Component
 *
 * Direct text input for knowledge base content.
 *
 * Features:
 * - Rich text area (textarea for MVP, Tiptap for future)
 * - Character count
 * - Preview mode
 *
 * Future Enhancement: Replace with Tiptap editor for rich formatting
 */

import React, { useState } from "react";
import { FileText, Eye, Edit3 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TextInputSourceProps {
  content?: string;
  onChange: (content: string) => void;
  className?: string;
}

export const TextInputSource: React.FC<TextInputSourceProps> = ({
  content = "",
  onChange,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const characterCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split("\n").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Text Content</h3>
        <p className="text-sm text-muted-foreground">Enter or paste text content directly</p>
      </div>

      {/* Edit/Preview Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="edit" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            <span>{characterCount} characters</span>
            <span>{lineCount} lines</span>
          </div>
        </div>

        {/* Edit Tab */}
        <TabsContent value="edit" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="text-content">Content</Label>
            <Textarea
              id="text-content"
              placeholder="Enter your text content here...

You can paste formatted text, and it will be preserved.

This content will be processed and embedded for semantic search."
              value={content}
              onChange={(e) => onChange(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: You can paste content from documents, web pages, or other sources
            </p>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-4">
          {content.trim() ? (
            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {content}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No content to preview</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Switch to Edit tab to add content
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Future Enhancement Notice */}
      {content.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 shrink-0">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-1">Future Enhancement</h4>
                <p className="text-xs text-muted-foreground">
                  Rich text formatting (bold, italic, lists, etc.) will be available in a future
                  update using Tiptap editor
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TextInputSource;
