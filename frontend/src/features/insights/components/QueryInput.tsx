/**
 * QueryInput Component
 *
 * Natural language query input with send button and example suggestions.
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QueryInputProps {
  onSubmit: (query: string, language: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showLanguageSelector?: boolean;
  showExamples?: boolean;
}

const EXAMPLE_QUERIES = [
  "What is the total revenue by month?",
  "Show me the top 10 customers by sales",
  "What are the trends in the last 6 months?",
  "Compare sales across different regions",
  "What percentage of orders are completed?",
];

const EXAMPLE_QUERIES_ZH = [
  "每月的总收入是多少？",
  "显示销售额最高的10个客户",
  "过去6个月的趋势是什么？",
  "比较不同地区的销售额",
  "已完成订单的百分比是多少？",
];

export const QueryInput: React.FC<QueryInputProps> = ({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Ask a question about your data...",
  className,
  showLanguageSelector = true,
  showExamples = true,
}) => {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const examples = language === "zh" ? EXAMPLE_QUERIES_ZH : EXAMPLE_QUERIES;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isLoading || disabled) return;

    onSubmit(trimmedQuery, language);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    textareaRef.current?.focus();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Example Queries */}
      {showExamples && !query && !disabled && (
        <div className="flex flex-wrap gap-2">
          {examples.slice(0, 3).map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleExampleClick(example)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                "text-xs text-muted-foreground bg-muted/50",
                "hover:bg-muted hover:text-foreground transition-colors",
                "border border-transparent hover:border-border"
              )}
            >
              <Sparkles className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{example}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "flex items-end gap-2 p-2 rounded-xl border bg-background transition-colors",
            !disabled && "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "opacity-60"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Select a dataset first" : placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              "flex-1 min-h-[40px] max-h-[150px] resize-none border-0 focus-visible:ring-0 p-2",
              "bg-transparent placeholder:text-muted-foreground/60"
            )}
          />

          <div className="flex items-center gap-2 shrink-0 pb-1">
            {/* Language Selector */}
            {showLanguageSelector && (
              <Select
                value={language}
                onValueChange={(val: "en" | "zh") => setLanguage(val)}
                disabled={disabled || isLoading}
              >
                <SelectTrigger className="w-[100px] h-9 text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="icon"
              disabled={!query.trim() || isLoading || disabled}
              className="h-9 w-9 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Character count hint */}
        {query.length > 200 && (
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {query.length} / 500 characters
          </p>
        )}
      </form>

      {/* Keyboard hint */}
      {!disabled && query && (
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Enter</kbd> to
          send, <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Shift+Enter</kbd>{" "}
          for new line
        </p>
      )}
    </div>
  );
};

export default QueryInput;
