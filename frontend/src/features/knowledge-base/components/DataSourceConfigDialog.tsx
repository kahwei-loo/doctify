/**
 * DataSourceConfigDialog Component
 *
 * Configuration dialog for creating data sources based on type.
 * Supports: uploaded_docs, website, text, qa_pairs
 */

import React, { useState, useCallback, useRef } from "react";
import {
  FileStack,
  Globe,
  FileText,
  MessageSquare,
  Database,
  Plus,
  Trash2,
  Loader2,
  X,
  Table2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DataSourceType, DataSourceConfig, QAPair, DataSource } from "../types";
import { UploadedDocsSource } from "./sources/UploadedDocsSource";
import { realKnowledgeBaseApi } from "../services/api";

interface DataSourceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBaseId: string;
  sourceType: DataSourceType;
  onSubmit: (name: string, config: DataSourceConfig) => Promise<DataSource | null>;
}

const TYPE_INFO: Record<DataSourceType, { label: string; icon: React.ReactNode; iconBg: string }> =
  {
    uploaded_docs: {
      label: "Uploaded Documents",
      icon: <FileStack className="h-5 w-5" />,
      iconBg: "bg-blue-500/10 text-blue-600",
    },
    website: {
      label: "Website Crawler",
      icon: <Globe className="h-5 w-5" />,
      iconBg: "bg-green-500/10 text-green-600",
    },
    text: {
      label: "Text Input",
      icon: <FileText className="h-5 w-5" />,
      iconBg: "bg-purple-500/10 text-purple-600",
    },
    qa_pairs: {
      label: "Q&A Pairs",
      icon: <MessageSquare className="h-5 w-5" />,
      iconBg: "bg-orange-500/10 text-orange-600",
    },
    structured_data: {
      label: "Structured Data",
      icon: <Database className="h-5 w-5" />,
      iconBg: "bg-indigo-500/10 text-indigo-600",
    },
  };

export const DataSourceConfigDialog: React.FC<DataSourceConfigDialogProps> = ({
  open,
  onOpenChange,
  knowledgeBaseId,
  sourceType,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Website config state
  const [url, setUrl] = useState("");
  const [maxDepth, setMaxDepth] = useState(2);
  const [includePatterns, setIncludePatterns] = useState("");
  const [excludePatterns, setExcludePatterns] = useState("");

  // Text config state
  const [textContent, setTextContent] = useState("");

  // Q&A pairs state
  const [qaPairs, setQaPairs] = useState<QAPair[]>([
    { id: `qa-${Date.now()}`, question: "", answer: "" },
  ]);

  // Uploaded documents state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Structured data state
  const [structuredFile, setStructuredFile] = useState<File | null>(null);
  const structuredFileInputRef = useRef<HTMLInputElement>(null);

  const typeInfo = TYPE_INFO[sourceType];

  const resetForm = useCallback(() => {
    setName("");
    setUrl("");
    setMaxDepth(2);
    setIncludePatterns("");
    setExcludePatterns("");
    setTextContent("");
    setQaPairs([{ id: `qa-${Date.now()}`, question: "", answer: "" }]);
    setSelectedFiles([]);
    setStructuredFile(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleAddQAPair = useCallback(() => {
    setQaPairs((prev) => [
      ...prev,
      { id: `qa-${Date.now()}-${prev.length}`, question: "", answer: "" },
    ]);
  }, []);

  const handleRemoveQAPair = useCallback((id: string) => {
    setQaPairs((prev) => prev.filter((pair) => pair.id !== id));
  }, []);

  const handleQAPairChange = useCallback(
    (id: string, field: "question" | "answer", value: string) => {
      setQaPairs((prev) =>
        prev.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair))
      );
    },
    []
  );

  const handleUploadedFiles = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const buildConfig = useCallback((): DataSourceConfig => {
    switch (sourceType) {
      case "website":
        return {
          url,
          max_depth: maxDepth,
          include_patterns: includePatterns
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean),
          exclude_patterns: excludePatterns
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean),
        };
      case "text":
        return {
          content: textContent,
        };
      case "qa_pairs":
        return {
          qa_pairs: qaPairs.filter((p) => p.question.trim() && p.answer.trim()),
        };
      case "uploaded_docs":
        // Files will be uploaded after data source creation
        // document_ids will be populated via API
        return {
          document_ids: [], // Will be populated after upload
        };
      case "structured_data":
        // File will be uploaded via the dedicated endpoint
        return {};
      default:
        return {};
    }
  }, [
    sourceType,
    url,
    maxDepth,
    includePatterns,
    excludePatterns,
    textContent,
    qaPairs,
    selectedFiles,
  ]);

  const isValid = useCallback((): boolean => {
    if (!name.trim()) return false;

    switch (sourceType) {
      case "website":
        return !!url.trim();
      case "text":
        return !!textContent.trim();
      case "qa_pairs":
        return qaPairs.some((p) => p.question.trim() && p.answer.trim());
      case "uploaded_docs":
        return selectedFiles.length > 0;
      case "structured_data":
        return structuredFile !== null;
      default:
        return false;
    }
  }, [name, sourceType, url, textContent, qaPairs, selectedFiles, structuredFile]);

  const handleSubmit = useCallback(async () => {
    if (!isValid()) return;

    setIsSubmitting(true);
    try {
      // Structured data: single-call upload endpoint (creates DS + processes file)
      if (sourceType === "structured_data" && structuredFile) {
        await realKnowledgeBaseApi.uploadStructuredData(
          knowledgeBaseId,
          structuredFile,
          name.trim() || undefined
        );
        // Signal parent to refresh (parent skips creation for structured_data)
        await onSubmit(name.trim(), {});
        handleClose();
        return;
      }

      const config = buildConfig();
      const createdDataSource = await onSubmit(name.trim(), config);

      // If uploaded_docs and files selected, upload them
      if (sourceType === "uploaded_docs" && selectedFiles.length > 0 && createdDataSource) {
        await realKnowledgeBaseApi.uploadDocuments(
          knowledgeBaseId,
          createdDataSource.id,
          selectedFiles
        );
      }

      handleClose();
    } catch (error) {
      console.error("Failed to create data source:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    buildConfig,
    name,
    onSubmit,
    handleClose,
    sourceType,
    selectedFiles,
    structuredFile,
    knowledgeBaseId,
  ]);

  const renderWebsiteForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Website URL *</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://docs.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">The starting URL for the crawler</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxDepth">Maximum Crawl Depth</Label>
        <Input
          id="maxDepth"
          type="number"
          min={1}
          max={5}
          value={maxDepth}
          onChange={(e) => setMaxDepth(parseInt(e.target.value) || 2)}
        />
        <p className="text-xs text-muted-foreground">How many levels deep to follow links (1-5)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="includePatterns">Include Patterns (optional)</Label>
        <Textarea
          id="includePatterns"
          placeholder="/docs/*&#10;/guides/*"
          value={includePatterns}
          onChange={(e) => setIncludePatterns(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">URL patterns to include (one per line)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excludePatterns">Exclude Patterns (optional)</Label>
        <Textarea
          id="excludePatterns"
          placeholder="/changelog&#10;/archive/*"
          value={excludePatterns}
          onChange={(e) => setExcludePatterns(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">URL patterns to exclude (one per line)</p>
      </div>
    </div>
  );

  const renderTextForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="textContent">Text Content *</Label>
        <Textarea
          id="textContent"
          placeholder="Enter or paste your text content here..."
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          rows={10}
        />
        <p className="text-xs text-muted-foreground">
          The text will be chunked and embedded for RAG queries
        </p>
      </div>
    </div>
  );

  const renderQAPairsForm = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        {qaPairs.map((pair, index) => (
          <div key={pair.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Q&A Pair {index + 1}</span>
              {qaPairs.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQAPair(pair.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`question-${pair.id}`}>Question</Label>
              <Input
                id={`question-${pair.id}`}
                placeholder="What is...?"
                value={pair.question}
                onChange={(e) => handleQAPairChange(pair.id, "question", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`answer-${pair.id}`}>Answer</Label>
              <Textarea
                id={`answer-${pair.id}`}
                placeholder="The answer is..."
                value={pair.answer}
                onChange={(e) => handleQAPairChange(pair.id, "answer", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={handleAddQAPair}>
        <Plus className="h-4 w-4 mr-2" />
        Add Q&A Pair
      </Button>
    </div>
  );

  const renderUploadedDocsForm = () => (
    <UploadedDocsSource
      selectedFiles={selectedFiles}
      onFilesSelected={handleUploadedFiles}
      className="space-y-4"
    />
  );

  const handleStructuredFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setStructuredFile(file);
  }, []);

  const handleStructuredFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["csv", "xlsx", "xls"].includes(ext || "")) {
        setStructuredFile(file);
      }
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStructuredDataForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload File (CSV or Excel) *</Label>
        {!structuredFile ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              "hover:border-primary/50 hover:bg-primary/5"
            )}
            onClick={() => structuredFileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleStructuredFileDrop}
          >
            <Table2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop your CSV or Excel file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-3">
              Supports .csv, .xlsx, .xls (max 50MB)
            </p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-indigo-500/10">
                <Table2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium truncate max-w-[300px]">{structuredFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(structuredFile.size)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStructuredFile(null);
                if (structuredFileInputRef.current) {
                  structuredFileInputRef.current.value = "";
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <input
          ref={structuredFileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleStructuredFileSelect}
        />
        <p className="text-xs text-muted-foreground">
          The file schema will be extracted and data embedded for RAG queries
        </p>
      </div>
    </div>
  );

  const renderConfigForm = () => {
    switch (sourceType) {
      case "website":
        return renderWebsiteForm();
      case "text":
        return renderTextForm();
      case "qa_pairs":
        return renderQAPairsForm();
      case "uploaded_docs":
        return renderUploadedDocsForm();
      case "structured_data":
        return renderStructuredDataForm();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("rounded-lg p-2", typeInfo.iconBg)}>{typeInfo.icon}</div>
            Configure {typeInfo.label}
          </DialogTitle>
          <DialogDescription>Set up your data source configuration</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Data Source Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Product Documentation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Type-specific configuration */}
          {renderConfigForm()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Data Source"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataSourceConfigDialog;
