/**
 * WidgetEmbedDialog Component
 *
 * Dialog showing the embeddable chat widget code for an assistant.
 * Includes copy-to-clipboard, position/color config, and demo link.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Assistant } from "../types";

interface WidgetEmbedDialogProps {
  open: boolean;
  onClose: () => void;
  assistant: Assistant;
}

export const WidgetEmbedDialog: React.FC<WidgetEmbedDialogProps> = ({
  open,
  onClose,
  assistant,
}) => {
  const [position, setPosition] = useState(assistant.widget_config?.position || "bottom-right");
  const [primaryColor, setPrimaryColor] = useState(
    assistant.widget_config?.primary_color || "#3b82f6"
  );
  const [copied, setCopied] = useState(false);

  const embedCode = `<!-- Doctify Chat Widget -->
<script>
  window.doctifyWidgetConfig = {
    assistantId: "${assistant.assistant_id}",
    assistantName: "${assistant.name}",
    position: "${position}",
    primaryColor: "${primaryColor}",
  };
</script>
<script src="https://cdn.doctify.ai/widget.js" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDemo = () => {
    window.open(`/public-chat-demo?assistantId=${assistant.assistant_id}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Widget Embed Code</DialogTitle>
          <DialogDescription>
            Add the chat widget for <strong>{assistant.name}</strong> to your website.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Assistant ID */}
          <div className="grid gap-2">
            <Label>Assistant ID</Label>
            <code className="bg-muted px-3 py-2 rounded-md text-sm font-mono">
              {assistant.assistant_id}
            </code>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Embed Code */}
          <div className="grid gap-2">
            <Label>Embed Code</Label>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed max-h-[200px]">
              <code>{embedCode}</code>
            </pre>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleOpenDemo}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Demo Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
