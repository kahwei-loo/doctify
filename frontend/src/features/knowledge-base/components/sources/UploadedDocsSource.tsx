/**
 * UploadedDocsSource Component
 *
 * Document upload interface for knowledge base.
 *
 * Features:
 * - 100% reuses DocumentUploadZone component
 * - Drag-and-drop support
 * - File type validation (PDF, PNG, JPG)
 * - Upload queue management
 */

import React, { useState } from 'react';
import { FileStack, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentUploadZone, getFileRejectionMessage } from '@/features/documents/components/DocumentUploadZone';
import type { FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface UploadedDocsSourceProps {
  onFilesSelected?: (files: File[]) => void;
  className?: string;
}

export const UploadedDocsSource: React.FC<UploadedDocsSourceProps> = ({
  onFilesSelected,
  className,
}) => {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const handleFilesAccepted = (files: File[]) => {
    setUploadErrors([]);
    onFilesSelected?.(files);
  };

  const handleFilesRejected = (rejections: FileRejection[]) => {
    const errors = rejections.map((rejection) =>
      getFileRejectionMessage(rejection)
    );
    setUploadErrors(errors);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Upload Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload PDF files, images, and documents to extract knowledge
        </p>
      </div>

      {/* Upload Zone */}
      <DocumentUploadZone
        onFilesAccepted={handleFilesAccepted}
        onFilesRejected={handleFilesRejected}
      />

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {uploadErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 shrink-0">
              <FileStack className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-medium">Supported File Types</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• PDF documents (text will be extracted automatically)</li>
                <li>• Images (PNG, JPG) with OCR for text recognition</li>
                <li>• Maximum file size: 10MB per file</li>
                <li>• Upload up to 20 files at once</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MVP Limitations */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-orange-500/10 shrink-0">
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-medium">Current Limitations</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Document processing may take a few minutes</li>
                <li>• OCR accuracy depends on image quality</li>
                <li>• Scanned PDFs will be processed with OCR</li>
                <li>• Tables and complex layouts may require manual review</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadedDocsSource;
