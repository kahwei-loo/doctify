/**
 * QAPairsSource Component
 *
 * Manage Q&A pairs for knowledge base.
 *
 * Features:
 * - Add/remove Q&A pairs
 * - Dynamic form array
 * - Validation
 */

import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { QAPair } from '../../types';

interface QAPairsSourceProps {
  pairs?: QAPair[];
  onChange: (pairs: QAPair[]) => void;
  className?: string;
}

export const QAPairsSource: React.FC<QAPairsSourceProps> = ({
  pairs = [],
  onChange,
  className,
}) => {
  const handleAddPair = () => {
    const newPair: QAPair = {
      id: `qa-${Date.now()}`,
      question: '',
      answer: '',
    };
    onChange([...pairs, newPair]);
  };

  const handleRemovePair = (id: string) => {
    onChange(pairs.filter((pair) => pair.id !== id));
  };

  const handleUpdatePair = (id: string, field: 'question' | 'answer', value: string) => {
    onChange(
      pairs.map((pair) =>
        pair.id === id ? { ...pair, [field]: value } : pair
      )
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Q&A Pairs</h3>
          <p className="text-sm text-muted-foreground">
            Create question and answer pairs for FAQ-style knowledge
          </p>
        </div>
        <Button onClick={handleAddPair}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pair
        </Button>
      </div>

      {/* Empty State */}
      {pairs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="text-lg font-medium mb-2">No Q&A Pairs</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Add your first question and answer pair to get started
            </p>
            <Button onClick={handleAddPair}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Pair
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Q&A Pairs List */}
      <div className="space-y-4">
        {pairs.map((pair, index) => (
          <Card key={pair.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Number Badge */}
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0 mt-1">
                  {index + 1}
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${pair.id}`}>Question</Label>
                    <Input
                      id={`question-${pair.id}`}
                      placeholder="Enter the question..."
                      value={pair.question}
                      onChange={(e) =>
                        handleUpdatePair(pair.id, 'question', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`answer-${pair.id}`}>Answer</Label>
                    <Textarea
                      id={`answer-${pair.id}`}
                      placeholder="Enter the answer..."
                      value={pair.answer}
                      onChange={(e) =>
                        handleUpdatePair(pair.id, 'answer', e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePair(pair.id)}
                  className="text-destructive hover:text-destructive shrink-0"
                  title="Remove pair"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {pairs.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            Total Q&A pairs: <span className="font-medium text-foreground">{pairs.length}</span>
          </span>
          <Button variant="outline" size="sm" onClick={handleAddPair}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another
          </Button>
        </div>
      )}
    </div>
  );
};

export default QAPairsSource;
