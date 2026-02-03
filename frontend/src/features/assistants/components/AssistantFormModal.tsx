/**
 * AssistantFormModal Component
 *
 * Modal dialog for creating and editing AI assistants with form validation.
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
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import type { Assistant, AIProvider, CreateAssistantRequest } from '../types';

// Form validation schema
const assistantFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  model_config: z.object({
    provider: z.enum(['openai', 'anthropic', 'google'], {
      errorMap: () => ({ message: 'Please select a valid AI provider' }),
    }),
    model: z.string().min(1, 'Model is required'),
    temperature: z.number().min(0).max(2),
    max_tokens: z.number().min(100).max(10000).optional(),
  }),
});

type AssistantFormData = z.infer<typeof assistantFormSchema>;

// Model options by provider
const modelOptions: Record<AIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-ultra', label: 'Gemini Ultra' },
  ],
};

interface AssistantFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAssistantRequest) => void;
  assistant?: Assistant | null; // If provided, edit mode
  isSubmitting?: boolean;
}

export const AssistantFormModal: React.FC<AssistantFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  assistant,
  isSubmitting = false,
}) => {
  const isEditMode = !!assistant;

  // Form state
  const [formData, setFormData] = useState<AssistantFormData>({
    name: '',
    description: '',
    model_config: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000,
    },
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when assistant changes (edit mode)
  useEffect(() => {
    if (assistant) {
      setFormData({
        name: assistant.name,
        description: assistant.description,
        model_config: {
          provider: assistant.model_config.provider,
          model: assistant.model_config.model,
          temperature: assistant.model_config.temperature ?? 0.7,
          max_tokens: assistant.model_config.max_tokens ?? 2000,
        },
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        model_config: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 2000,
        },
      });
    }
    setErrors({});
  }, [assistant, open]);

  // Handle provider change (update model to first option)
  const handleProviderChange = (provider: AIProvider) => {
    setFormData((prev) => ({
      ...prev,
      model_config: {
        ...prev.model_config,
        provider,
        model: modelOptions[provider][0].value,
      },
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with Zod
    const result = assistantFormSchema.safeParse(formData);

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

    // Submit validated data - cast to CreateAssistantRequest
    onSubmit(formData as unknown as CreateAssistantRequest);
  };

  // Handle close (reset form)
  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Assistant' : 'Create New Assistant'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update your AI assistant configuration.'
                : 'Configure a new AI assistant to handle customer conversations.'}
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
                placeholder="e.g., Customer Support Assistant"
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
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="description"
                placeholder="Describe what this assistant does..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.description ? 'border-destructive' : ''
                }`}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            {/* AI Provider Selection */}
            <div className="grid gap-2">
              <Label htmlFor="provider">
                AI Provider <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.model_config.provider}
                onValueChange={(value) => handleProviderChange(value as AIProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="grid gap-2">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.model_config.model}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    model_config: { ...prev.model_config, model: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions[formData.model_config.provider].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Temperature Slider */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">Temperature</Label>
                <span className="text-sm text-muted-foreground">
                  {formData.model_config.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                value={[formData.model_config.temperature]}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    model_config: { ...prev.model_config, temperature: value[0] },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower values make output more focused and deterministic. Higher values
                increase creativity.
              </p>
            </div>

            {/* Max Tokens */}
            <div className="grid gap-2">
              <Label htmlFor="max_tokens">Max Tokens (Optional)</Label>
              <Input
                id="max_tokens"
                type="number"
                min={100}
                max={10000}
                placeholder="2000"
                value={formData.model_config.max_tokens || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    model_config: {
                      ...prev.model_config,
                      max_tokens: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  }))
                }
                className={errors['model_config.max_tokens'] ? 'border-destructive' : ''}
              />
              {errors['model_config.max_tokens'] && (
                <p className="text-sm text-destructive">
                  {errors['model_config.max_tokens']}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Assistant' : 'Create Assistant'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
