/**
 * Mock chat conversations data for demo mode
 */

export const DEMO_CHAT_CONVERSATIONS = [
  {
    id: 'conv-001',
    title: 'Document Analysis Query',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    message_count: 8,
    status: 'active',
  },
  {
    id: 'conv-002',
    title: 'Invoice Processing Help',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    message_count: 6,
    status: 'resolved',
  },
  {
    id: 'conv-003',
    title: 'Contract Extraction Questions',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
    message_count: 10,
    status: 'active',
  },
];

export const DEMO_CHAT_MESSAGES = {
  'conv-001': [
    {
      id: 'msg-001-01',
      role: 'user',
      content: 'How can I improve the accuracy of document extraction?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: 'msg-001-02',
      role: 'assistant',
      content: 'There are several ways to improve document extraction accuracy:\n\n1. **Image Quality**: Ensure scanned documents have at least 300 DPI resolution\n2. **File Format**: PDF files with embedded text work better than image-only scans\n3. **Preprocessing**: Use image enhancement features for low-quality scans\n4. **Custom Templates**: Create extraction templates for frequently processed document types\n5. **Manual Review**: Review and correct extracted data to improve the AI model\n\nWould you like me to explain any of these in more detail?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 23.5).toISOString(),
    },
    {
      id: 'msg-001-03',
      role: 'user',
      content: 'Yes, how do custom templates work?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    },
    {
      id: 'msg-001-04',
      role: 'assistant',
      content: 'Custom templates allow you to define specific extraction rules for document types:\n\n**How it works:**\n1. Upload a sample document of the type you want to process\n2. Mark the fields you want to extract (e.g., invoice number, date, total amount)\n3. Define field types and validation rules\n4. Save the template\n\n**Benefits:**\n- Faster processing (no need for full AI analysis)\n- Higher accuracy for known document layouts\n- Consistent field naming across documents\n- Automatic validation and error detection\n\nYou can create templates from the Templates page in the sidebar. Would you like me to walk you through creating your first template?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 22.5).toISOString(),
    },
  ],
  'conv-002': [
    {
      id: 'msg-002-01',
      role: 'user',
      content: 'I uploaded 20 invoices but only 15 are showing as completed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: 'msg-002-02',
      role: 'assistant',
      content: 'Let me help you check the status of those invoices. The missing 5 invoices could be in different states:\n\n1. Still processing (check the "Processing" tab)\n2. Failed processing (check the "Failed" tab)\n3. Pending in queue (check the "Pending" tab)\n\nCan you check the Documents page and let me know what status the other 5 invoices show?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 47.5).toISOString(),
    },
    {
      id: 'msg-002-03',
      role: 'user',
      content: '3 are still processing and 2 failed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
    },
    {
      id: 'msg-002-04',
      role: 'assistant',
      content: 'Good, that accounts for all 20 invoices:\n\n**Processing (3):** These are still being analyzed by the AI. Typical processing time is 2-5 minutes per document depending on complexity.\n\n**Failed (2):** For the failed invoices, you can:\n1. Click on them to see the error message\n2. Common issues: poor scan quality, unsupported format, or corrupted files\n3. Try re-uploading with better quality scans\n4. Use the "Reprocess" button to retry\n\nWould you like me to explain how to check the error details for the failed documents?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 46.5).toISOString(),
    },
  ],
  'conv-003': [
    {
      id: 'msg-003-01',
      role: 'user',
      content: 'Can the system extract contract expiration dates automatically?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    },
    {
      id: 'msg-003-02',
      role: 'assistant',
      content: 'Yes! The system can automatically extract contract expiration dates. Here\'s how:\n\n**Automatic Detection:**\n- The AI looks for date patterns near keywords like "expires", "expiration", "term ends", "valid until"\n- Dates are extracted and normalized to ISO format (YYYY-MM-DD)\n- Confidence scores indicate extraction reliability\n\n**To enable:**\n1. Create or edit your project settings\n2. Enable "Contract Analysis" mode\n3. The system will automatically extract key dates including expiration\n\n**Additional Features:**\n- Set up alerts for contracts expiring soon\n- Export expiration dates to CSV\n- Filter contracts by expiration date range\n\nWould you like help setting up contract analysis for your project?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 71.5).toISOString(),
    },
  ],
};

export const DEMO_CHAT_STATS = {
  total_conversations: DEMO_CHAT_CONVERSATIONS.length,
  total_messages: Object.values(DEMO_CHAT_MESSAGES).reduce((sum, msgs) => sum + msgs.length, 0),
  active_conversations: DEMO_CHAT_CONVERSATIONS.filter((c) => c.status === 'active').length,
  resolved_conversations: DEMO_CHAT_CONVERSATIONS.filter((c) => c.status === 'resolved').length,
  avg_messages_per_conversation: 8,
  avg_response_time_seconds: 2.5,
};
