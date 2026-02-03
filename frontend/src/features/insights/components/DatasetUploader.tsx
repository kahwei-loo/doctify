/**
 * DatasetUploader Component
 *
 * Drag-and-drop upload zone for datasets (CSV, XLSX).
 */

import React, { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUploadDatasetMutation } from '@/store/api/insightsApi';

// Supported file types
const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface DatasetUploaderProps {
  onSuccess?: (datasetId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const DatasetUploader: React.FC<DatasetUploaderProps> = ({
  onSuccess,
  onError,
  className,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [uploadDataset, { isLoading }] = useUploadDatasetMutation();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const errorMsg = rejection.errors.map(e => e.message).join(', ');
      onError?.(errorMsg);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      // Auto-fill name from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDatasetName(nameWithoutExt);
      setIsDialogOpen(true);
    }
  }, [onError]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleUpload = async () => {
    if (!selectedFile || !datasetName.trim()) return;

    try {
      const result = await uploadDataset({
        file: selectedFile,
        name: datasetName.trim(),
        description: description.trim() || undefined,
      }).unwrap();

      setIsDialogOpen(false);
      setSelectedFile(null);
      setDatasetName('');
      setDescription('');
      onSuccess?.(result.dataset_id);
    } catch (err: any) {
      const errorMsg = err?.data?.detail || 'Failed to upload dataset';
      onError?.(errorMsg);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    setDatasetName('');
    setDescription('');
  };

  const getStateStyles = () => {
    if (isLoading) {
      return 'border-muted-foreground/20 bg-muted/50 cursor-not-allowed';
    }
    if (isDragReject) {
      return 'border-destructive bg-destructive/5 cursor-not-allowed';
    }
    if (isDragAccept) {
      return 'border-primary bg-primary/5 cursor-copy';
    }
    if (isDragActive) {
      return 'border-primary/50 bg-primary/5 cursor-copy';
    }
    return 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer';
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all min-h-[200px]',
          getStateStyles(),
          className
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            'flex items-center justify-center h-16 w-16 rounded-full mb-4 transition-colors',
            isDragActive
              ? isDragReject
                ? 'bg-destructive/10'
                : 'bg-primary/10'
              : 'bg-muted'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : isDragReject ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : (
            <Upload
              className={cn(
                'h-8 w-8 transition-colors',
                isDragActive ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          )}
        </div>

        <p className="text-lg font-medium mb-1">
          {isLoading
            ? 'Uploading...'
            : isDragActive
            ? isDragReject
              ? 'Invalid file type'
              : 'Drop file to upload'
            : 'Drag & drop dataset here'}
        </p>

        <p className="text-sm text-muted-foreground mb-4">
          or click to browse your files
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-xs">CSV</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-xs">XLSX</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Maximum file size: 50MB
        </p>
      </div>

      {/* Dataset Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dataset</DialogTitle>
            <DialogDescription>
              {selectedFile && (
                <span className="flex items-center gap-2 mt-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-name">Dataset Name *</Label>
              <Input
                id="dataset-name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Enter dataset name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-description">Description (optional)</Label>
              <Input
                id="dataset-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the dataset"
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isLoading || !datasetName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DatasetUploader;
