/**
 * KBSettings Component
 *
 * Knowledge base configuration settings.
 *
 * Features:
 * - Embedding model selection
 * - Chunk size configuration
 * - Overlap configuration
 * - Save to localStorage (Week 2)
 * - Settings preview
 */

import React, { useState, useEffect } from "react";
import { Settings, Save, Info, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import type { KnowledgeBase, ChunkStrategy } from "../types";

interface KBSettingsProps {
  knowledgeBase: KnowledgeBase;
  onSave?: (config: KnowledgeBase["config"]) => void;
  className?: string;
}

const CHUNK_STRATEGIES = [
  {
    value: "semantic" as ChunkStrategy,
    label: "Semantic",
    description: "Sentence-boundary-aware chunking (recommended)",
  },
  {
    value: "recursive" as ChunkStrategy,
    label: "Recursive",
    description: "Hierarchical splitting by paragraph, sentence, then word",
  },
  {
    value: "fixed" as ChunkStrategy,
    label: "Fixed",
    description: "Fixed token window (legacy)",
  },
];

const EMBEDDING_MODELS = [
  {
    value: "text-embedding-3-small",
    label: "OpenAI Text Embedding 3 Small",
    dimensions: 1536,
    description: "Fast and cost-effective for most use cases",
  },
  {
    value: "text-embedding-3-large",
    label: "OpenAI Text Embedding 3 Large",
    dimensions: 3072,
    description: "Higher accuracy, better for complex queries",
  },
];

const CHUNK_SIZES = [
  { value: 512, label: "512 tokens", description: "Small chunks, more granular search" },
  { value: 1024, label: "1024 tokens", description: "Balanced (recommended)" },
  { value: 2048, label: "2048 tokens", description: "Large chunks, more context" },
];

const OVERLAP_OPTIONS = [
  { value: 0, label: "No overlap", description: "Distinct chunks, no redundancy" },
  { value: 128, label: "128 tokens", description: "Small overlap (recommended)" },
  { value: 256, label: "256 tokens", description: "Large overlap, better continuity" },
];

export const KBSettings: React.FC<KBSettingsProps> = ({ knowledgeBase, onSave, className }) => {
  const [embeddingModel, setEmbeddingModel] = useState<string>(
    knowledgeBase.config.embedding_model || "text-embedding-3-small"
  );
  const [chunkSize, setChunkSize] = useState(knowledgeBase.config.chunk_size?.toString() || "1024");
  const [overlap, setOverlap] = useState(knowledgeBase.config.chunk_overlap?.toString() || "128");
  const [chunkStrategy, setChunkStrategy] = useState<string>(
    knowledgeBase.config.chunk_strategy || "semantic"
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      embeddingModel !== (knowledgeBase.config.embedding_model || "text-embedding-3-small") ||
      parseInt(chunkSize) !== (knowledgeBase.config.chunk_size || 1024) ||
      parseInt(overlap) !== (knowledgeBase.config.chunk_overlap || 128) ||
      chunkStrategy !== (knowledgeBase.config.chunk_strategy || "semantic");
    setHasChanges(changed);
  }, [embeddingModel, chunkSize, overlap, chunkStrategy, knowledgeBase.config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Mock save to localStorage (Week 2)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newConfig: KnowledgeBase["config"] = {
      ...knowledgeBase.config,
      embedding_model: embeddingModel as KnowledgeBase["config"]["embedding_model"],
      chunk_size: parseInt(chunkSize) as KnowledgeBase["config"]["chunk_size"],
      chunk_overlap: parseInt(overlap) as KnowledgeBase["config"]["chunk_overlap"],
      chunk_strategy: chunkStrategy as ChunkStrategy,
    };

    localStorage.setItem(`kb_config_${knowledgeBase.id}`, JSON.stringify(newConfig));

    onSave?.(newConfig);

    setIsSaving(false);
    setSaveSuccess(true);
    setHasChanges(false);

    // Hide success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const selectedModel = EMBEDDING_MODELS.find((m) => m.value === embeddingModel);
  const selectedChunk = CHUNK_SIZES.find((c) => c.value === parseInt(chunkSize));
  const selectedOverlap = OVERLAP_OPTIONS.find((o) => o.value === parseInt(overlap));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Knowledge Base Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how content is processed and embedded
        </p>
      </div>

      {/* Embedding Model */}
      <div className="space-y-2">
        <Label htmlFor="embedding-model">Embedding Model</Label>
        <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
          <SelectTrigger id="embedding-model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMBEDDING_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex flex-col">
                  <span>{model.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.dimensions} dimensions - {model.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModel && (
          <p className="text-xs text-muted-foreground">
            {selectedModel.description} • {selectedModel.dimensions} dimensions
          </p>
        )}
      </div>

      {/* Chunk Size */}
      <div className="space-y-2">
        <Label htmlFor="chunk-size">Chunk Size</Label>
        <Select value={chunkSize} onValueChange={setChunkSize}>
          <SelectTrigger id="chunk-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHUNK_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value.toString()}>
                {size.label} - {size.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedChunk && (
          <p className="text-xs text-muted-foreground">{selectedChunk.description}</p>
        )}
      </div>

      {/* Chunk Overlap */}
      <div className="space-y-2">
        <Label htmlFor="chunk-overlap">Chunk Overlap</Label>
        <Select value={overlap} onValueChange={setOverlap}>
          <SelectTrigger id="chunk-overlap">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OVERLAP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label} - {opt.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOverlap && (
          <p className="text-xs text-muted-foreground">{selectedOverlap.description}</p>
        )}
      </div>

      {/* Chunk Strategy */}
      <div className="space-y-2">
        <Label htmlFor="chunk-strategy">Chunking Strategy</Label>
        <Select value={chunkStrategy} onValueChange={setChunkStrategy}>
          <SelectTrigger id="chunk-strategy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHUNK_STRATEGIES.map((strategy) => (
              <SelectItem key={strategy.value} value={strategy.value}>
                {strategy.label} - {strategy.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {CHUNK_STRATEGIES.find((s) => s.value === chunkStrategy)?.description}
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
        {hasChanges && (
          <span className="text-sm text-muted-foreground">You have unsaved changes</span>
        )}
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <Zap className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Preview */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Current Configuration</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Model:</span>
                <span className="ml-2 font-medium">
                  {EMBEDDING_MODELS.find((m) => m.value === embeddingModel)?.label}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Dimensions:</span>
                <span className="ml-2 font-medium">
                  {EMBEDDING_MODELS.find((m) => m.value === embeddingModel)?.dimensions}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Chunk Size:</span>
                <span className="ml-2 font-medium">{chunkSize} tokens</span>
              </div>
              <div>
                <span className="text-muted-foreground">Overlap:</span>
                <span className="ml-2 font-medium">{overlap} tokens</span>
              </div>
              <div>
                <span className="text-muted-foreground">Strategy:</span>
                <span className="ml-2 font-medium capitalize">{chunkStrategy}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-dashed bg-orange-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-medium text-orange-900">Important Notes</h4>
              <ul className="text-xs text-orange-800 space-y-1">
                <li>• Changing these settings requires regenerating all embeddings</li>
                <li>• Different chunk sizes affect search granularity and context</li>
                <li>• Larger models provide better accuracy but cost more</li>
                <li>• Settings changes only apply to new embeddings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-medium">Configuration Guide</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  <strong>Chunk Size:</strong> Larger chunks preserve context but reduce search
                  precision
                </li>
                <li>
                  <strong>Overlap:</strong> Prevents information loss at chunk boundaries
                </li>
                <li>
                  <strong>Model:</strong> Larger models offer better semantic understanding
                </li>
                <li>
                  <strong>Recommendation:</strong> Start with defaults and adjust based on results
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KBSettings;
