/**
 * Mock Assistants Service
 *
 * Provides mock data for assistants and conversations during Week 4 development.
 * Will be replaced with real API calls in Week 5.
 */

import type {
  Assistant,
  AssistantStats,
  Conversation,
  Message,
  ConversationStatus,
} from "../types";

// Initial Mock Data (immutable reference)
const INITIAL_ASSISTANTS: Assistant[] = [
  {
    assistant_id: "ast-1",
    name: "General Support",
    description: "General customer inquiries and support",
    model_config: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2000,
    },
    is_active: true,
    created_at: "2025-01-20T10:00:00Z",
    updated_at: "2025-01-26T10:00:00Z",
    total_conversations: 156,
    unresolved_count: 23,
    avg_response_time: 1.8,
    resolution_rate: 0.92,
  },
  {
    assistant_id: "ast-2",
    name: "Technical Support",
    description: "Technical troubleshooting and API help",
    model_config: {
      provider: "anthropic",
      model: "claude-3-opus",
      temperature: 0.5,
      max_tokens: 3000,
    },
    is_active: true,
    created_at: "2025-01-21T14:30:00Z",
    updated_at: "2025-01-25T09:15:00Z",
    total_conversations: 89,
    unresolved_count: 12,
    avg_response_time: 2.1,
    resolution_rate: 0.88,
  },
  {
    assistant_id: "ast-3",
    name: "Sales Assistant",
    description: "Product information and pricing inquiries",
    model_config: {
      provider: "openai",
      model: "gpt-3.5-turbo",
      temperature: 0.8,
      max_tokens: 1500,
    },
    is_active: true,
    created_at: "2025-01-22T08:00:00Z",
    updated_at: "2025-01-26T11:30:00Z",
    total_conversations: 203,
    unresolved_count: 31,
    avg_response_time: 1.2,
    resolution_rate: 0.95,
  },
  {
    assistant_id: "ast-4",
    name: "Beta Testing Assistant",
    description: "Testing new AI models (inactive)",
    model_config: {
      provider: "google",
      model: "gemini-pro",
      temperature: 0.6,
    },
    is_active: false,
    created_at: "2025-01-15T16:00:00Z",
    updated_at: "2025-01-18T10:00:00Z",
    total_conversations: 12,
    unresolved_count: 0,
    avg_response_time: 3.5,
    resolution_rate: 0.75,
  },
];

// Mutable working copy for CRUD operations
let mockAssistants: Assistant[] = [...INITIAL_ASSISTANTS];

// Export for read-only access
export const getMockAssistants = () => mockAssistants;

// Mock Conversations Data
export const mockConversations: Record<string, Conversation[]> = {
  "ast-1": [
    {
      conversation_id: "conv-1",
      assistant_id: "ast-1",
      status: "unresolved",
      last_message_preview: "How do I upload a document to the system?",
      last_message_at: "2025-01-26T10:30:00Z",
      created_at: "2025-01-26T10:25:00Z",
      message_count: 3,
    },
    {
      conversation_id: "conv-2",
      assistant_id: "ast-1",
      status: "in_progress",
      last_message_preview: "Can you help me reset my password?",
      last_message_at: "2025-01-26T09:45:00Z",
      created_at: "2025-01-26T09:40:00Z",
      message_count: 5,
    },
    {
      conversation_id: "conv-3",
      assistant_id: "ast-1",
      status: "resolved",
      last_message_preview: "Thanks for the help!",
      last_message_at: "2025-01-26T08:20:00Z",
      created_at: "2025-01-26T08:00:00Z",
      resolved_at: "2025-01-26T08:20:00Z",
      message_count: 7,
    },
    {
      conversation_id: "conv-4",
      assistant_id: "ast-1",
      status: "unresolved",
      last_message_preview: "What are the pricing plans?",
      last_message_at: "2025-01-26T07:15:00Z",
      created_at: "2025-01-26T07:10:00Z",
      message_count: 2,
    },
  ],
  "ast-2": [
    {
      conversation_id: "conv-5",
      assistant_id: "ast-2",
      status: "unresolved",
      last_message_preview: "API authentication not working",
      last_message_at: "2025-01-26T11:00:00Z",
      created_at: "2025-01-26T10:55:00Z",
      message_count: 4,
    },
    {
      conversation_id: "conv-6",
      assistant_id: "ast-2",
      status: "in_progress",
      last_message_preview: "Webhook events not triggering",
      last_message_at: "2025-01-26T10:15:00Z",
      created_at: "2025-01-26T10:00:00Z",
      message_count: 6,
    },
  ],
  "ast-3": [
    {
      conversation_id: "conv-7",
      assistant_id: "ast-3",
      status: "unresolved",
      last_message_preview: "Do you offer enterprise plans?",
      last_message_at: "2025-01-26T10:45:00Z",
      created_at: "2025-01-26T10:40:00Z",
      message_count: 2,
    },
  ],
};

// Mock Messages Data
export const mockMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      message_id: "msg-1",
      conversation_id: "conv-1",
      role: "user",
      content: "How do I upload a document to the system?",
      created_at: "2025-01-26T10:25:00Z",
    },
    {
      message_id: "msg-2",
      conversation_id: "conv-1",
      role: "assistant",
      content:
        "I'd be happy to help you upload a document! Here's how:\n\n1. Navigate to the Documents page\n2. Click the 'Upload' button or drag and drop your file\n3. Select the project you want to associate it with\n4. Wait for the upload to complete\n\nSupported formats: PDF, PNG, JPG, WEBP, TIFF (max 10MB)\n\nIs there a specific document type you're trying to upload?",
      created_at: "2025-01-26T10:26:00Z",
    },
    {
      message_id: "msg-3",
      conversation_id: "conv-1",
      role: "user",
      content: "Yes, I have a PDF invoice. Thanks!",
      created_at: "2025-01-26T10:30:00Z",
    },
  ],
  "conv-2": [
    {
      message_id: "msg-4",
      conversation_id: "conv-2",
      role: "user",
      content: "Can you help me reset my password?",
      created_at: "2025-01-26T09:40:00Z",
    },
    {
      message_id: "msg-5",
      conversation_id: "conv-2",
      role: "assistant",
      content:
        "I can guide you through the password reset process:\n\n1. Click 'Forgot Password' on the login page\n2. Enter your email address\n3. Check your email for a reset link\n4. Click the link and create a new password\n\nIf you don't receive the email within 5 minutes, check your spam folder. Would you like me to help with anything else?",
      created_at: "2025-01-26T09:41:00Z",
    },
    {
      message_id: "msg-6",
      conversation_id: "conv-2",
      role: "user",
      content: "I don't see the email in my inbox or spam",
      created_at: "2025-01-26T09:43:00Z",
    },
    {
      message_id: "msg-7",
      conversation_id: "conv-2",
      role: "assistant",
      content:
        "No problem! Let me escalate this to our support team. Can you confirm:\n1. The email address you used to register\n2. Whether you're using a corporate or personal email\n\nOur team will reach out within 1 hour to help you regain access.",
      created_at: "2025-01-26T09:44:00Z",
    },
    {
      message_id: "msg-8",
      conversation_id: "conv-2",
      role: "user",
      content: "My email is john.doe@company.com, it's a corporate email",
      created_at: "2025-01-26T09:45:00Z",
    },
  ],
};

// Mock Stats
export const mockAssistantStats: AssistantStats = {
  total_assistants: 4,
  active_assistants: 3,
  total_conversations: 460,
  unresolved_conversations: 66,
  avg_response_time: 1.7,
  avg_resolution_rate: 0.91,
};

// Helper Functions
export const getAssistantStats = (): Promise<AssistantStats> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockAssistantStats), 300);
  });
};

export const getAssistants = (): Promise<Assistant[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockAssistants]), 400);
  });
};

// Reset function for testing
export const resetMockData = () => {
  mockAssistants = [...INITIAL_ASSISTANTS];
};

export const getAssistantById = (assistantId: string): Promise<Assistant | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const assistant = mockAssistants.find((a) => a.assistant_id === assistantId);
      resolve(assistant);
    }, 200);
  });
};

export const getConversations = (
  assistantId: string,
  statusFilter?: ConversationStatus
): Promise<Conversation[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let conversations = mockConversations[assistantId] || [];

      if (statusFilter) {
        conversations = conversations.filter((c) => c.status === statusFilter);
      }

      resolve(conversations);
    }, 300);
  });
};

export const getConversationMessages = (conversationId: string): Promise<Message[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const messages = mockMessages[conversationId] || [];
      resolve(messages);
    }, 250);
  });
};

export const createAssistant = (data: {
  name: string;
  description: string;
  model_config: any;
}): Promise<Assistant> => {
  console.log("[MockService] createAssistant called with:", data);
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("[MockService] createAssistant: Creating new assistant...");
      const newAssistant: Assistant = {
        assistant_id: `ast-${Date.now()}`,
        name: data.name,
        description: data.description,
        model_config: data.model_config,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_conversations: 0,
        unresolved_count: 0,
        avg_response_time: 0,
        resolution_rate: 0,
      };

      mockAssistants.push(newAssistant);
      console.log(
        "[MockService] createAssistant: SUCCESS - resolving with:",
        newAssistant.assistant_id
      );
      resolve(newAssistant);
    }, 500);
  });
};

export const updateAssistant = (
  assistantId: string,
  data: Partial<Assistant>
): Promise<Assistant> => {
  console.log("[MockService] updateAssistant called:", assistantId, data);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("[MockService] updateAssistant: Finding assistant...");
      const index = mockAssistants.findIndex((a) => a.assistant_id === assistantId);

      if (index === -1) {
        console.log("[MockService] updateAssistant: ERROR - Assistant not found");
        reject(new Error("Assistant not found"));
        return;
      }

      mockAssistants[index] = {
        ...mockAssistants[index],
        ...data,
        updated_at: new Date().toISOString(),
      };

      console.log(
        "[MockService] updateAssistant: SUCCESS - resolving with:",
        mockAssistants[index].assistant_id
      );
      resolve(mockAssistants[index]);
    }, 400);
  });
};

export const deleteAssistant = (assistantId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockAssistants.findIndex((a) => a.assistant_id === assistantId);

      if (index === -1) {
        reject(new Error("Assistant not found"));
        return;
      }

      mockAssistants.splice(index, 1);
      resolve();
    }, 300);
  });
};

export const updateConversationStatus = (
  conversationId: string,
  status: ConversationStatus
): Promise<Conversation> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Find conversation across all assistants
      for (const assistantId in mockConversations) {
        const conversations = mockConversations[assistantId];
        const index = conversations.findIndex((c) => c.conversation_id === conversationId);

        if (index !== -1) {
          conversations[index] = {
            ...conversations[index],
            status,
            resolved_at: status === "resolved" ? new Date().toISOString() : undefined,
          };

          resolve(conversations[index]);
          return;
        }
      }

      reject(new Error("Conversation not found"));
    }, 300);
  });
};

export const sendMessage = (conversationId: string, content: string): Promise<Message> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newMessage: Message = {
        message_id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        role: "assistant",
        content,
        created_at: new Date().toISOString(),
      };

      if (!mockMessages[conversationId]) {
        mockMessages[conversationId] = [];
      }

      mockMessages[conversationId].push(newMessage);
      resolve(newMessage);
    }, 400);
  });
};
