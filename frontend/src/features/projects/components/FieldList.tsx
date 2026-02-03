/**
 * FieldList Component
 *
 * Displays a list of extraction fields with edit and delete actions.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import type { ExtractionField } from '../types';
import { FIELD_TYPE_LABELS, normalizeFieldType } from '../types';

interface FieldListProps {
  fields: ExtractionField[];
  onEdit: (field: ExtractionField) => void;
  onDelete: (fieldId: string) => void;
  onReorder?: (fields: ExtractionField[]) => void;
}

export const FieldList: React.FC<FieldListProps> = ({
  fields,
  onEdit,
  onDelete,
}) => {
  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No extraction fields defined yet.</p>
        <p className="text-sm mt-1">
          Add fields to define what data to extract from documents.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Field Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id}>
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-medium font-mono text-sm">
                {field.name}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {FIELD_TYPE_LABELS[normalizeFieldType(field.type)]}
                </Badge>
              </TableCell>
              <TableCell>
                {field.required ? (
                  <Badge variant="default">Required</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Optional</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {field.description || '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(field)}
                    title="Edit field"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Delete field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Field</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the field "{field.name}"?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(field.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FieldList;
