import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ProviderSelectProps {
  value: string;
  onChange: (value: string) => void;
  existingProviders: string[];
}

export const ProviderSelect: React.FC<ProviderSelectProps> = ({
  value,
  onChange,
  existingProviders,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const providers = useMemo(() => {
    const unique = Array.from(new Set(existingProviders)).sort();
    if (!search) return unique;
    const lower = search.toLowerCase();
    return unique.filter((p) => p.toLowerCase().includes(lower));
  }, [existingProviders, search]);

  const showCustomOption =
    search.trim() !== '' && !providers.some((p) => p.toLowerCase() === search.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || 'Select provider...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Search or type new..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {providers.map((provider) => (
            <button
              key={provider}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
                value === provider && 'bg-muted'
              )}
              onClick={() => {
                onChange(provider);
                setOpen(false);
                setSearch('');
              }}
            >
              <Check
                className={cn(
                  'h-4 w-4 shrink-0',
                  value === provider ? 'opacity-100' : 'opacity-0'
                )}
              />
              {provider}
            </button>
          ))}
          {showCustomOption && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-primary"
              onClick={() => {
                onChange(search.trim());
                setOpen(false);
                setSearch('');
              }}
            >
              <Check className="h-4 w-4 shrink-0 opacity-0" />
              Add "{search.trim()}"
            </button>
          )}
          {providers.length === 0 && !showCustomOption && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No providers found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
