/**
 * DocumentConfirmationView Component
 *
 * Provides OCR confirmation interface with:
 * - Left panel: Original document preview
 * - Right panel: Editable extracted data
 * - Bottom action bar: Discard and Save & Confirm buttons
 *
 * Week 1 Task 1.1: OCR Confirmation Flow Implementation
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  DocumentPreview,
  ExtractedStructuredView,
  LineItemsTable,
  RestoreDraftDialog,
  type LineItem,
} from "@/features/documents/components";
import type { ExtractionResult, FieldChange, DocumentDetail } from "@/features/documents/types";
import { useConfirmDocumentMutation } from "@/store/api/documentsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentConfirmationViewProps {
  documentId: string;
  document: DocumentDetail;
  previewUrl?: string;
}

/**
 * Extract line items from extraction result
 * Handles various field name conventions
 */
const extractLineItems = (result: ExtractionResult | null | undefined): LineItem[] => {
  if (!result?.metadata) return [];

  const possibleFields = ["line_items", "lineItems", "items", "lines"];
  for (const field of possibleFields) {
    const items = result.metadata[field];
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any, index: number) => ({
        itemNo: item.item_no || item.itemNo || item.no || String(index + 1),
        description: item.description || item.name || item.item || "",
        quantity: item.quantity || item.qty || 1,
        unit: item.unit,
        unitPrice: item.unit_price || item.unitPrice || item.price,
        discount: item.discount,
        taxRate: item.tax_rate || item.taxRate,
        taxAmount: item.tax_amount || item.taxAmount || item.tax,
        amount: item.amount || item.total || item.subtotal || 0,
        confidence: item.confidence,
      }));
    }
  }

  return [];
};

export const DocumentConfirmationView: React.FC<DocumentConfirmationViewProps> = ({
  documentId,
  document,
  previewUrl,
}) => {
  const navigate = useNavigate();

  // Redux API mutation
  const [confirmDocument] = useConfirmDocumentMutation();

  // State management
  const [editedData, setEditedData] = useState<ExtractionResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);

  // Refs
  const originalDataRef = useRef<ExtractionResult | null>(null);
  const MAX_RETRIES = 3;

  // Draft restore dialog state
  const [showRestoreDraftDialog, setShowRestoreDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ExtractionResult | null>(null);
  const [draftTimestamp, setDraftTimestamp] = useState<string | undefined>(undefined);

  // Initialize edited data from document
  useEffect(() => {
    if (document?.extraction_result) {
      const extractionData = document.extraction_result;

      // Store original data
      originalDataRef.current = extractionData;

      // Check for saved draft
      const draftKey = `draft_${documentId}`;
      const draftTimestampKey = `draft_timestamp_${documentId}`;
      const savedDraft = localStorage.getItem(draftKey);
      const savedTimestamp = localStorage.getItem(draftTimestampKey);

      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          // Store draft and show dialog instead of window.confirm
          setPendingDraft(draft);
          setDraftTimestamp(savedTimestamp || undefined);
          setShowRestoreDraftDialog(true);
          // Initially load extraction data; user can choose to restore
          setEditedData(extractionData);
          setHasChanges(false);
        } catch (error) {
          console.error("Failed to parse draft:", error);
          localStorage.removeItem(draftKey);
          localStorage.removeItem(draftTimestampKey);
          setEditedData(extractionData);
          setHasChanges(false);
        }
      } else {
        setEditedData(extractionData);
        setHasChanges(false);
      }
    }
  }, [document, documentId]);

  // Handle draft restore
  const handleRestoreDraft = useCallback(() => {
    if (pendingDraft) {
      setEditedData(pendingDraft);
      setHasChanges(true);
    }
    setShowRestoreDraftDialog(false);
    setPendingDraft(null);
    setDraftTimestamp(undefined);
  }, [pendingDraft]);

  // Handle draft discard
  const handleDiscardDraft = useCallback(() => {
    const draftKey = `draft_${documentId}`;
    const draftTimestampKey = `draft_timestamp_${documentId}`;
    localStorage.removeItem(draftKey);
    localStorage.removeItem(draftTimestampKey);
    setShowRestoreDraftDialog(false);
    setPendingDraft(null);
    setDraftTimestamp(undefined);
  }, [documentId]);

  // Handle field changes with nested path support and change tracking
  const handleFieldChange = useCallback((fieldPath: string, value: any) => {
    setEditedData((prev) => {
      if (!prev) return null;

      // Get original value for tracking
      const keys = fieldPath.split(".");
      let originalValue: any;

      if (keys.length === 1) {
        originalValue = originalDataRef.current?.[keys[0] as keyof ExtractionResult];
      } else if (keys[0] === "metadata" && keys.length === 2) {
        originalValue = originalDataRef.current?.metadata?.[keys[1]];
      }

      // Track field change if value is different
      if (originalValue !== value) {
        setFieldChanges((prevChanges) => {
          const existingIndex = prevChanges.findIndex((c) => c.field === fieldPath);
          const newChange: FieldChange = {
            field: fieldPath,
            original_value: originalValue,
            new_value: value,
            timestamp: new Date().toISOString(),
          };

          if (existingIndex >= 0) {
            // Update existing change
            const updated = [...prevChanges];
            updated[existingIndex] = newChange;
            return updated;
          } else {
            // Add new change
            return [...prevChanges, newChange];
          }
        });
      }

      // Update edited data
      const newData = { ...prev };

      if (keys.length === 1) {
        // Top-level field
        return { ...newData, [keys[0]]: value };
      } else if (keys[0] === "metadata" && keys.length === 2) {
        // Metadata field
        return {
          ...newData,
          metadata: {
            ...newData.metadata,
            [keys[1]]: value,
          },
        };
      }

      // Fallback for other nested structures
      return newData;
    });
    setHasChanges(true);
  }, []);

  // Handle discard action
  const handleDiscard = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      navigate("/documents");
    }
  }, [hasChanges, navigate]);

  // Confirm discard and reset
  const handleConfirmDiscard = useCallback(() => {
    // Clear draft from localStorage
    localStorage.removeItem(`draft_${documentId}`);
    localStorage.removeItem(`draft_timestamp_${documentId}`);

    setEditedData(document?.extraction_result || null);
    setHasChanges(false);
    setFieldChanges([]);
    setShowDiscardDialog(false);
    navigate("/documents");
  }, [document, documentId, navigate]);

  // Handle save action with retry mechanism
  const handleSave = useCallback(async () => {
    if (!editedData) return;

    const attemptSave = async (currentRetry: number): Promise<void> => {
      try {
        setIsSaving(true);
        setRetryCount(currentRetry);

        await confirmDocument({
          documentId,
          data: {
            ocr_data: editedData,
            user_confirmed: true,
            field_changes: fieldChanges.length > 0 ? fieldChanges : undefined,
          },
        }).unwrap();

        // Success - clear draft and navigate
        localStorage.removeItem(`draft_${documentId}`);
        localStorage.removeItem(`draft_timestamp_${documentId}`);
        toast.success("Document confirmed successfully");
        navigate("/documents");
      } catch (error: any) {
        // Check if we should retry
        if (currentRetry < MAX_RETRIES) {
          const nextRetry = currentRetry + 1;
          const backoffDelay = 1000 * Math.pow(2, currentRetry); // Exponential backoff

          toast.error(`Save failed. Retrying... (${nextRetry}/${MAX_RETRIES})`, {
            duration: backoffDelay,
          });

          // Wait with exponential backoff, then retry
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          return attemptSave(nextRetry);
        } else {
          // Max retries reached
          const errorMessage =
            error?.data?.detail ||
            error?.message ||
            "Failed to confirm document after multiple retries";
          toast.error(errorMessage, { duration: 5000 });
          throw error;
        }
      } finally {
        if (currentRetry >= MAX_RETRIES || currentRetry === 0) {
          setIsSaving(false);
        }
      }
    };

    try {
      await attemptSave(0);
    } catch (error) {
      // Final error already handled above
      console.error("Failed to save document:", error);
    }
  }, [documentId, editedData, fieldChanges, confirmDocument, navigate, MAX_RETRIES]);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    if (!hasChanges || !editedData) return;

    const timer = setTimeout(() => {
      try {
        const draftKey = `draft_${documentId}`;
        const draftTimestampKey = `draft_timestamp_${documentId}`;
        localStorage.setItem(draftKey, JSON.stringify(editedData));
        localStorage.setItem(draftTimestampKey, new Date().toISOString());
        console.log("Draft auto-saved");
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [editedData, documentId, hasChanges]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Extract line items
  const lineItems = extractLineItems(editedData);

  // Loading state
  if (!document) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading document...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Left-Right Split Layout */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left Panel: Original Document Preview */}
        <div className="border rounded-lg p-4 overflow-auto bg-card">
          <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-card pb-2 border-b">
            Original Document
          </h3>
          <DocumentPreview
            url={previewUrl}
            mimeType={document.mime_type}
            filename={document.filename}
          />
        </div>

        {/* Right Panel: Editable Extracted Data */}
        <div className="border rounded-lg p-4 overflow-auto bg-card">
          <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-card pb-2 border-b">
            Extracted Data
          </h3>
          {editedData && (
            <div className="space-y-6">
              <ExtractedStructuredView
                result={editedData}
                editable={true}
                onChange={handleFieldChange}
                renderLineItems={() => null} // Don't render line items here, use separate table below
              />
              {lineItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Line Items</h4>
                  <LineItemsTable items={lineItems} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t bg-card px-4">
        <div className="text-sm text-muted-foreground">
          {hasChanges && (
            <span className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              You have unsaved changes
              {fieldChanges.length > 0 && (
                <span className="text-xs">
                  ({fieldChanges.length} field{fieldChanges.length > 1 ? "s" : ""} modified)
                </span>
              )}
            </span>
          )}
          {isSaving && retryCount > 0 && (
            <span className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Retry attempt {retryCount}/{MAX_RETRIES}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDiscard} disabled={isSaving} className="gap-2">
            <X className="h-4 w-4" />
            Discard
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save & Confirm
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the extracted data. If you discard, all your corrections
              will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Draft Dialog */}
      <RestoreDraftDialog
        open={showRestoreDraftDialog}
        onOpenChange={setShowRestoreDraftDialog}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
        draftTimestamp={draftTimestamp}
      />
    </div>
  );
};
