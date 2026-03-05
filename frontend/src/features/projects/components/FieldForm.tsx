/**
 * FieldForm Component
 *
 * Modal form for adding or editing extraction fields.
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExtractionField, FieldType } from "../types";
import { FIELD_TYPE_LABELS, normalizeFieldType } from "../types";

interface FieldFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: ExtractionField | null;
  onSave: (field: Omit<ExtractionField, "id"> & { id?: string }) => void;
  existingFieldNames: string[];
}

const FIELD_TYPES: FieldType[] = ["text", "number", "date", "boolean", "array", "object"];

export const FieldForm: React.FC<FieldFormProps> = ({
  open,
  onOpenChange,
  field,
  onSave,
  existingFieldNames,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!field;

  // Initialize form when field changes
  useEffect(() => {
    if (field) {
      setName(field.name);
      setType(normalizeFieldType(field.type));
      setRequired(field.required);
      setDescription(field.description || "");
    } else {
      setName("");
      setType("text");
      setRequired(false);
      setDescription("");
    }
    setError(null);
  }, [field, open]);

  const validateFieldName = (value: string): boolean => {
    // Check for empty
    if (!value.trim()) {
      setError("Field name is required");
      return false;
    }

    // Check for valid characters (alphanumeric, underscore, no spaces at start/end)
    const validNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!validNameRegex.test(value)) {
      setError(
        "Field name must start with a letter and contain only letters, numbers, and underscores"
      );
      return false;
    }

    // Check for duplicates (excluding current field when editing)
    const otherFieldNames = existingFieldNames.filter((n) => !field || n !== field.name);
    if (otherFieldNames.includes(value)) {
      setError("A field with this name already exists");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFieldName(name)) {
      return;
    }

    onSave({
      id: field?.id,
      name: name.trim(),
      type,
      required,
      description: description.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Field" : "Add Extraction Field"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modify the extraction field properties."
                : "Define a new field to extract from documents."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Field Name */}
            <div className="grid gap-2">
              <Label htmlFor="fieldName">Field Name</Label>
              <Input
                id="fieldName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) validateFieldName(e.target.value);
                }}
                placeholder="e.g., invoice_number"
                className={error ? "border-destructive" : ""}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                Use snake_case for field names (e.g., po_number, total_amount)
              </p>
            </div>

            {/* Field Type */}
            <div className="grid gap-2">
              <Label htmlFor="fieldType">Field Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {FIELD_TYPE_LABELS[ft]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="fieldRequired">Required</Label>
                <p className="text-xs text-muted-foreground">Mark this field as mandatory</p>
              </div>
              <Switch id="fieldRequired" checked={required} onCheckedChange={setRequired} />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="fieldDescription">Description (Optional)</Label>
              <Input
                id="fieldDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this field"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Add Field"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FieldForm;
