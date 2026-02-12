/**
 * AI Assistants Types
 *
 * Type definitions for AI assistants, conversations, and chat functionality.
 */

// Assistant Types
export type AssistantStatus = 'active' | 'inactive';
export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AIModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-opus' | 'claude-3-sonnet' | 'gemini-pro';

export interface ModelConfig {
  provider: AIProvider;
  model: AIModel;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
}

export interface WidgetConfig {
  primary_color: string;
  position: string;
  welcome_message?: string;
  placeholder_text?: string;
}

export interface Assistant {
  assistant_id: string;
  name: string;
  description: string;
  model_config: ModelConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_conversations: number;
  unresolved_count: number;
  avg_response_time?: number;
  resolution_rate?: number;
  knowledge_base_id?: string | null;
  widget_config?: WidgetConfig;
}

export interface AssistantListResponse {
  success: boolean;
  data: Assistant[];
  timestamp: string;
}

export interface CreateAssistantRequest {
  name: string;
  description: string;
  model_config: ModelConfig;
  is_active?: boolean;
  knowledge_base_id?: string | null;
}

export interface UpdateAssistantRequest {
  assistant_id: string;
  name?: string;
  description?: string;
  model_config?: ModelConfig;
  is_active?: boolean;
  knowledge_base_id?: string | null;
}

export interface AssistantStats {
  total_assistants: number;
  active_assistants: number;
  total_conversations: number;
  unresolved_conversations: number;
  avg_response_time: number;
  avg_resolution_rate: number;
}

export interface AssistantAnalytics {
  assistant_id: string;
  period: string; // 'day' | 'week' | 'month'
  conversation_count: number;
  message_count: number;
  avg_response_time: number;
  resolution_rate: number;
  user_satisfaction?: number;
}

export interface AssistantFilters {
  status?: AssistantStatus;
  search?: string;
}

// Conversation Types
export type ConversationStatus = 'unresolved' | 'in_progress' | 'resolved';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationContext {
  source?: 'test_dialog' | 'widget' | 'api';
  page_url?: string;
  [key: string]: any;
}

export interface Conversation {
  conversation_id: string;
  assistant_id: string;
  status: ConversationStatus;
  user_fingerprint?: string; // For public chats
  last_message_preview: string;
  last_message_at: string;
  created_at: string;
  resolved_at?: string;
  message_count: number;
  context?: ConversationContext;
}

export interface ConversationListResponse {
  success: boolean;
  data: Conversation[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface ConversationFilters {
  assistant_id?: string;
  status?: ConversationStatus;
  search?: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface MessageListResponse {
  success: boolean;
  data: Message[];
  timestamp: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  role: MessageRole;
}

// Public Chat Types
export interface PublicMessageRequest {
  content: string;
  session_id: string;
}

export interface PublicChatSession {
  session_id: string;
  assistant_id: string;
  conversation_id?: string;
  message_count: number;
  created_at: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// WebSocket Types
export type WebSocketMessageType =
  | 'message.chunk'
  | 'message.complete'
  | 'message.error'
  | 'conversation.status_change'
  | 'typing.start'
  | 'typing.stop';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: string;
}

export interface MessageChunk {
  type: 'message.chunk';
  content: string;
  is_final?: boolean;
}

// Empty States
export interface EmptyStateConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
