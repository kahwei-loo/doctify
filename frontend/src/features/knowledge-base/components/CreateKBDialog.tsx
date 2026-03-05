/**
 * CreateKBDialog Component
 *
 * Dialog for creating a new Knowledge Base.
 *
 * Features:
 * - Name input (required)
 * - Description textarea (optional)
 * - Form validation
 * - Loading state during creation
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { knowledgeBaseApi } from "../services/mockData";
import type { KnowledgeBase } from "../types";

interface CreateKBDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (kb: KnowledgeBase) => void;
}

export const CreateKBDialog: React.FC<CreateKBDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await knowledgeBaseApi.createKnowledgeBase({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Reset form
      setName("");
      setDescription("");

      // Call success callback
      onSuccess(response.data);

      // Close dialog
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create knowledge base");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setDescription("");
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              Create a new knowledge base to organize your data sources and embeddings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="kb-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="kb-name"
                placeholder="e.g., Product Documentation"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>

            {/* Description Textarea */}
            <div className="grid gap-2">
              <Label htmlFor="kb-description">Description (optional)</Label>
              <Textarea
                id="kb-description"
                placeholder="Describe what this knowledge base is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Knowledge Base
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateKBDialog;
