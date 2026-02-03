/**
 * GenerateEmbeddingsButton Component
 *
 * Trigger embeddings generation with progress display.
 *
 * Features:
 * - Generate button with loading state
 * - Progress bar with batch count
 * - Mock progress simulation (Week 2)
 * - Success/error states
 */

import React, { useState } from 'react';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RegenerateEmbeddingsDialog } from './RegenerateEmbeddingsDialog';
import { cn } from '@/lib/utils';

interface GenerateEmbeddingsButtonProps {
  knowledgeBaseId: string;
  dataSourceCount: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

interface GenerationProgress {
  processed: number;
  total: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  message?: string;
}

export const GenerateEmbeddingsButton: React.FC<GenerateEmbeddingsButtonProps> = ({
  knowledgeBaseId,
  dataSourceCount,
  onComplete,
  onError,
  className,
}) => {
  const [progress, setProgress] = useState<GenerationProgress>({
    processed: 0,
    total: 0,
    status: 'idle',
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleGenerateClick = () => {
    if (dataSourceCount === 0) {
      setProgress({
        processed: 0,
        total: 0,
        status: 'error',
        message: 'No data sources available. Please add data sources first.',
      });
      return;
    }
    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmGenerate = async () => {
    if (dataSourceCount === 0) {
      setProgress({
        processed: 0,
        total: 0,
        status: 'error',
        message: 'No data sources available. Please add data sources first.',
      });
      return;
    }

    // Mock generation process
    const totalChunks = dataSourceCount * 10; // Simulate 10 chunks per source
    setProgress({
      processed: 0,
      total: totalChunks,
      status: 'generating',
    });

    // Simulate batch processing
    const batchSize = 5;
    const totalBatches = Math.ceil(totalChunks / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

      const processed = Math.min((batch + 1) * batchSize, totalChunks);
      setProgress({
        processed,
        total: totalChunks,
        status: 'generating',
      });
    }

    // Complete
    setProgress({
      processed: totalChunks,
      total: totalChunks,
      status: 'completed',
      message: `Successfully generated ${totalChunks} embeddings`,
    });

    onComplete?.();

    // Reset after 3 seconds
    setTimeout(() => {
      setProgress({
        processed: 0,
        total: 0,
        status: 'idle',
      });
    }, 3000);
  };

  const progressPercentage =
    progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Embeddings Generation</h3>
          <p className="text-xs text-muted-foreground">
            Generate vector embeddings from your data sources
          </p>
        </div>
        <Button
          onClick={handleGenerateClick}
          disabled={progress.status === 'generating' || dataSourceCount === 0}
          className="gap-2"
        >
          {progress.status === 'generating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Generate Embeddings
            </>
          )}
        </Button>
      </div>

      {/* Progress Display */}
      {progress.status === 'generating' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-medium">Generating embeddings...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress.processed} / {progress.total} chunks
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Processing in batches of 5. This may take a few minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {progress.status === 'completed' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {progress.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {progress.status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{progress.message}</AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      {progress.status === 'idle' && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 shrink-0">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-medium">How It Works</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Text content is split into chunks (configurable size)</li>
                  <li>• Each chunk is converted to a vector embedding using AI</li>
                  <li>• Embeddings enable semantic search and similarity matching</li>
                  <li>• Processing time depends on the amount of content</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <RegenerateEmbeddingsDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmGenerate}
        dataSourceCount={dataSourceCount}
        isRegenerating={progress.status === 'generating'}
      />
    </div>
  );
};

export default GenerateEmbeddingsButton;
