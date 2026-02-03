/**
 * FieldEditor Component
 *
 * Main schema builder component that manages extraction fields.
 * Combines FieldList and FieldForm for CRUD operations.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FieldList } from './FieldList';
import { FieldForm } from './FieldForm';
import type { ExtractionField } from '../types';

interface FieldEditorProps {
  fields: ExtractionField[];
  onChange: (fields: ExtractionField[]) => void;
}

/**
 * Generate a unique ID for a new field
 */
const generateFieldId = (): string => {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const FieldEditor: React.FC<FieldEditorProps> = ({
  fields,
  onChange,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<ExtractionField | null>(null);

  // Get list of existing field names (for duplicate validation)
  const existingFieldNames = fields.map((f) => f.name);

  // Handle opening the form for adding a new field
  const handleAdd = useCallback(() => {
    setEditingField(null);
    setIsFormOpen(true);
  }, []);

  // Handle opening the form for editing an existing field
  const handleEdit = useCallback((field: ExtractionField) => {
    setEditingField(field);
    setIsFormOpen(true);
  }, []);

  // Handle saving a field (add or update)
  const handleSave = useCallback(
    (fieldData: Omit<ExtractionField, 'id'> & { id?: string }) => {
      if (fieldData.id) {
        // Update existing field
        const updatedFields = fields.map((f) =>
          f.id === fieldData.id
            ? { ...fieldData, id: fieldData.id } as ExtractionField
            : f
        );
        onChange(updatedFields);
      } else {
        // Add new field
        const newField: ExtractionField = {
          ...fieldData,
          id: generateFieldId(),
        };
        onChange([...fields, newField]);
      }
    },
    [fields, onChange]
  );

  // Handle deleting a field
  const handleDelete = useCallback(
    (fieldId: string) => {
      const updatedFields = fields.filter((f) => f.id !== fieldId);
      onChange(updatedFields);
    },
    [fields, onChange]
  );

  // Handle reordering fields (drag and drop - future enhancement)
  const handleReorder = useCallback(
    (reorderedFields: ExtractionField[]) => {
      onChange(reorderedFields);
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Extraction Fields</h3>
          <p className="text-sm text-muted-foreground">
            Define the fields to extract from documents in this project.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      <FieldList
        fields={fields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      <FieldForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        field={editingField}
        onSave={handleSave}
        existingFieldNames={existingFieldNames}
      />
    </div>
  );
};

export default FieldEditor;
