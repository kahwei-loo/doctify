/**
 * CorruptedFileError Component
 *
 * Displays error alert when a file is corrupted or cannot be processed.
 * Provides clear guidance on next steps for the user.
 *
 * Week 1 Task 1.2.1: Enhanced Error States
 */

import React from "react";
import { AlertCircle, Upload, FileX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CorruptedFileErrorProps {
  filename?: string;
  onUploadNew?: () => void;
}

export const CorruptedFileError: React.FC<CorruptedFileErrorProps> = ({
  filename,
  onUploadNew,
}) => {
  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <FileX className="h-4 w-4" />
        File Corrupted
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          {filename ? (
            <>
              The file <strong className="font-medium">{filename}</strong> appears to be corrupted
              and cannot be processed.
            </>
          ) : (
            "This file appears to be corrupted and cannot be processed."
          )}
        </p>

        <div className="bg-background/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">What you can try:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Check if the file opens correctly on your computer</li>
            <li>Try re-downloading or re-exporting the file</li>
            <li>Upload a different version of the same document</li>
            <li>Convert the file to a different format (e.g., PDF)</li>
          </ul>
        </div>

        {onUploadNew && (
          <div className="pt-2">
            <Button onClick={onUploadNew} variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Different File
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
