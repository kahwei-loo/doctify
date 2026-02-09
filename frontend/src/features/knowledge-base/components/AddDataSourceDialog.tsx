/**
 * AddDataSourceDialog Component
 *
 * Multi-step wizard for adding data sources.
 *
 * Steps:
 * 1. Type Selection - Choose data source type
 * 2. Configuration - Configure selected type
 */

import React, { useState } from 'react';
import {
  FileStack,
  Globe,
  FileText,
  MessageSquare,
  Database,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DataSourceType } from '../types';

interface AddDataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBaseId: string;
  onTypeSelected: (type: DataSourceType) => void;
}

/**
 * Data Source Type Option
 */
interface TypeOption {
  type: DataSourceType;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'uploaded_docs',
    label: 'Uploaded Documents',
    description: 'Upload PDF, images, and documents to extract knowledge',
    icon: <FileStack className="h-6 w-6" />,
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    type: 'website',
    label: 'Website Crawler',
    description: 'Crawl and index content from websites automatically',
    icon: <Globe className="h-6 w-6" />,
    iconBg: 'bg-green-500/10 text-green-600',
  },
  {
    type: 'text',
    label: 'Text Input',
    description: 'Directly input and format text content',
    icon: <FileText className="h-6 w-6" />,
    iconBg: 'bg-purple-500/10 text-purple-600',
  },
  {
    type: 'qa_pairs',
    label: 'Q&A Pairs',
    description: 'Create question and answer pairs for FAQ-style knowledge',
    icon: <MessageSquare className="h-6 w-6" />,
    iconBg: 'bg-orange-500/10 text-orange-600',
  },
  {
    type: 'structured_data',
    label: 'Structured Data',
    description: 'Upload CSV or Excel datasets for natural language analytics queries',
    icon: <Database className="h-6 w-6" />,
    iconBg: 'bg-indigo-500/10 text-indigo-600',
  },
];

/**
 * Type Selection Card
 */
interface TypeCardProps {
  option: TypeOption;
  selected: boolean;
  onClick: () => void;
}

const TypeCard: React.FC<TypeCardProps> = ({ option, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all w-full',
        'hover:border-primary/50 hover:bg-muted/50',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border'
      )}
    >
      <div className={cn('rounded-lg p-3 shrink-0', option.iconBg)}>
        {option.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium mb-1">{option.label}</h4>
        <p className="text-sm text-muted-foreground">{option.description}</p>
      </div>
    </button>
  );
};

export const AddDataSourceDialog: React.FC<AddDataSourceDialogProps> = ({
  open,
  onOpenChange,
  knowledgeBaseId,
  onTypeSelected,
}) => {
  const [selectedType, setSelectedType] = useState<DataSourceType | null>(null);

  const handleNext = () => {
    if (selectedType) {
      onTypeSelected(selectedType);
      onOpenChange(false);
      setSelectedType(null);
    }
  };

  const handleCancel = () => {
    setSelectedType(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Data Source</DialogTitle>
          <DialogDescription>
            Choose a data source type to add to your knowledge base
          </DialogDescription>
        </DialogHeader>

        {/* Type Selection */}
        <div className="grid gap-3 py-4">
          {TYPE_OPTIONS.map((option) => (
            <TypeCard
              key={option.type}
              option={option}
              selected={selectedType === option.type}
              onClick={() => setSelectedType(option.type)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleNext} disabled={!selectedType}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDataSourceDialog;
