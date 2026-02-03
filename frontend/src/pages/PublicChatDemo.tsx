/**
 * Public Chat Widget Demo Page
 *
 * Test page for the embeddable public chat widget.
 * This page simulates how the widget would appear on an external website.
 */

import React, { useState } from 'react';
import { PublicChatWidget } from '@/features/assistants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PublicChatDemo: React.FC = () => {
  // Widget configuration state
  const [config, setConfig] = useState({
    assistantId: 'ast-demo-1',
    assistantName: 'Doctify Support',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left',
    primaryColor: '#3b82f6',
    welcomeMessage: "Hi! I'm the Doctify assistant. How can I help you today?",
  });

  // Embed code
  const embedCode = `<!-- Doctify Chat Widget -->
<script>
  window.doctifyWidgetConfig = {
    assistantId: "${config.assistantId}",
    assistantName: "${config.assistantName}",
    position: "${config.position}",
    primaryColor: "${config.primaryColor}",
  };
</script>
<script src="https://cdn.doctify.ai/widget.js" async></script>`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Demo Page Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Public Chat Widget Demo
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Test the embeddable chat widget that can be added to any website.
            </p>
          </div>

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Customize the chat widget appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assistantName">Assistant Name</Label>
                  <Input
                    id="assistantName"
                    value={config.assistantName}
                    onChange={(e) =>
                      setConfig({ ...config, assistantName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={config.position}
                    onValueChange={(value: 'bottom-right' | 'bottom-left') =>
                      setConfig({ ...config, position: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) =>
                        setConfig({ ...config, primaryColor: e.target.value })
                      }
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) =>
                        setConfig({ ...config, primaryColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <Input
                    id="welcomeMessage"
                    value={config.welcomeMessage}
                    onChange={(e) =>
                      setConfig({ ...config, welcomeMessage: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Copy this code to add the widget to your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <Button
                className="mt-4"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                }}
              >
                Copy to Clipboard
              </Button>
            </CardContent>
          </Card>

          {/* Test Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Click the chat bubble in the {config.position} corner to open the widget</li>
                <li>Type a message and press Enter or click Send</li>
                <li>The AI will respond with a simulated message (mock data)</li>
                <li>Test rate limiting by sending many messages quickly (limit: 20/minute)</li>
                <li>You'll see a warning when approaching the limit</li>
                <li>Try minimizing and closing the chat window</li>
                <li>Refresh the page - your session should persist</li>
              </ol>
            </CardContent>
          </Card>

          {/* Sample Website Content */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Sample Website Content</CardTitle>
              <CardDescription>
                This simulates a typical website where the widget would be embedded
              </CardDescription>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <h2>Welcome to Our Website</h2>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
                ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                aliquip ex ea commodo consequat.
              </p>
              <h3>Our Services</h3>
              <ul>
                <li>Document Processing - Convert documents to digital format</li>
                <li>OCR Technology - Extract text from images and scans</li>
                <li>AI Analysis - Get insights from your documents</li>
                <li>Cloud Storage - Secure document storage</li>
              </ul>
              <p>
                Have questions? Use the chat widget in the corner to talk to our AI
                assistant!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* The Actual Widget */}
      <PublicChatWidget
        assistantId={config.assistantId}
        assistantName={config.assistantName}
        position={config.position}
        primaryColor={config.primaryColor}
        welcomeMessage={config.welcomeMessage}
      />
    </div>
  );
};

export default PublicChatDemo;
