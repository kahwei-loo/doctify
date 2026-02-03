/**
 * TemplateFormModal Component
 *
 * Modal dialog for creating and editing templates with form validation.
 * Supports both create and edit modes with Zod schema validation.
 */

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/store/api/templatesApi';
import { VALID_VISIBILITIES, VALID_DOCUMENT_TYPES } from '@/store/api/templatesApi';

// Form validation schema
const templateFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  document_type: z
    .enum(['invoice', 'receipt', 'contract', 'form', 'report', 'custom'])
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['private', 'public', 'organization'], {
    errorMap: () => ({ message: 'Please select a valid visibility' }),
  }),
  category: z.string().max(50, 'Category must not exceed 50 characters').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest | UpdateTemplateRequest) => void;
  template?: Template | null; // If provided, edit mode
  isSubmitting?: boolean;
}

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  template,
  isSubmitting = false,
}) => {
  const isEditMode = !!template;

  // Form state
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    document_type: '',
    visibility: 'private',
    category: '',
    tags: [],
  });

  // Tag input state
  const [tagInput, setTagInput] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when template changes (edit mode)
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        document_type: template.document_type || '',
        visibility: template.visibility,
        category: template.category || '',
        tags: template.tags || [],
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        document_type: '',
        visibility: 'private',
        category: '',
        tags: [],
      });
    }
    setErrors({});
    setTagInput('');
  }, [template, open]);

  // Handle tag addition
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), trimmedTag],
      }));
      setTagInput('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with Zod
    const result = templateFormSchema.safeParse(formData);

    if (!result.success) {
      // Extract validation errors
      const validationErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        validationErrors[path] = err.message;
      });
      setErrors(validationErrors);
      return;
    }

    // Submit validated data
    const submitData: CreateTemplateRequest | UpdateTemplateRequest = {
      name: formData.name,
      description: formData.description || undefined,
      document_type: formData.document_type || undefined,
      visibility: formData.visibility,
      category: formData.category || undefined,
      tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
    };

    onSubmit(submitData);
  };

  // Handle close (reset form)
  const handleClose = () => {
    setErrors({});
    setTagInput('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update template configuration.'
                : 'Create a new extraction template for document processing.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Invoice Template"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Description Field */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this template extracts..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Document Type Selection */}
            <div className="grid gap-2">
              <Label htmlFor="document_type">Document Type</Label>
              <Select
                value={formData.document_type || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, document_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {VALID_DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility Selection */}
            <div className="grid gap-2">
              <Label htmlFor="visibility">
                Visibility <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    visibility: value as 'private' | 'public' | 'organization',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Only You)</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Field */}
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., Financial, Legal, HR"
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className={errors.category ? 'border-destructive' : ''}
              />
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            {/* Tags Field */}
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Template' : 'Create Template'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
