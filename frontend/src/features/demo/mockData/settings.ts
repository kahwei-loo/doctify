/**
 * Mock settings data for demo mode
 * All settings are read-only in demo mode
 */

export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  document_processed: boolean;
  document_failed: boolean;
  weekly_summary: boolean;
  security_alerts: boolean;
  marketing_emails: boolean;
}

export interface ApiKeyInfo {
  key_id: string;
  name: string;
  prefix: string; // First 8 chars of key
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  permissions: string[];
  is_active: boolean;
}

export interface BillingInfo {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  plan_name: string;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  usage: {
    documents_processed: number;
    documents_limit: number;
    storage_used_mb: number;
    storage_limit_mb: number;
    api_calls: number;
    api_calls_limit: number;
  };
  payment_method: {
    type: 'card';
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  two_factor_method: 'app' | 'sms' | null;
  sessions: Array<{
    session_id: string;
    device: string;
    browser: string;
    ip_address: string;
    location: string;
    last_active: string;
    is_current: boolean;
  }>;
  login_history: Array<{
    timestamp: string;
    ip_address: string;
    location: string;
    device: string;
    success: boolean;
  }>;
}

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const DEMO_USER_PROFILE: UserProfile = {
  user_id: 'demo-user-001',
  email: 'demo@doctify.ai',
  full_name: 'Demo User',
  avatar_url: null,
  timezone: 'America/New_York',
  language: 'en',
  created_at: daysAgo(30),
  updated_at: daysAgo(1),
};

export const DEMO_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_notifications: true,
  document_processed: true,
  document_failed: true,
  weekly_summary: true,
  security_alerts: true,
  marketing_emails: false,
};

export const DEMO_API_KEYS: ApiKeyInfo[] = [
  {
    key_id: 'key-001',
    name: 'Production API Key',
    prefix: 'dk_live_',
    created_at: daysAgo(25),
    last_used_at: daysAgo(0),
    expires_at: null,
    permissions: ['documents:read', 'documents:write', 'projects:read', 'projects:write'],
    is_active: true,
  },
  {
    key_id: 'key-002',
    name: 'Development Key',
    prefix: 'dk_test_',
    created_at: daysAgo(20),
    last_used_at: daysAgo(2),
    expires_at: null,
    permissions: ['documents:read', 'documents:write'],
    is_active: true,
  },
  {
    key_id: 'key-003',
    name: 'Read-only Key',
    prefix: 'dk_ro__',
    created_at: daysAgo(15),
    last_used_at: daysAgo(5),
    expires_at: null,
    permissions: ['documents:read', 'projects:read'],
    is_active: false,
  },
];

export const DEMO_BILLING_INFO: BillingInfo = {
  plan: 'professional',
  plan_name: 'Professional',
  billing_cycle: 'monthly',
  current_period_start: daysAgo(15),
  current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  usage: {
    documents_processed: 47,
    documents_limit: 500,
    storage_used_mb: 256,
    storage_limit_mb: 5120, // 5GB
    api_calls: 1234,
    api_calls_limit: 10000,
  },
  payment_method: {
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    exp_month: 12,
    exp_year: 2026,
  },
};

export const DEMO_SECURITY_SETTINGS: SecuritySettings = {
  two_factor_enabled: true,
  two_factor_method: 'app',
  sessions: [
    {
      session_id: 'sess-001',
      device: 'Windows PC',
      browser: 'Chrome 120',
      ip_address: '192.168.1.100',
      location: 'New York, US',
      last_active: new Date().toISOString(),
      is_current: true,
    },
    {
      session_id: 'sess-002',
      device: 'iPhone 15',
      browser: 'Safari Mobile',
      ip_address: '192.168.1.101',
      location: 'New York, US',
      last_active: daysAgo(1),
      is_current: false,
    },
  ],
  login_history: [
    {
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.100',
      location: 'New York, US',
      device: 'Windows PC - Chrome',
      success: true,
    },
    {
      timestamp: daysAgo(1),
      ip_address: '192.168.1.101',
      location: 'New York, US',
      device: 'iPhone 15 - Safari',
      success: true,
    },
    {
      timestamp: daysAgo(2),
      ip_address: '192.168.1.100',
      location: 'New York, US',
      device: 'Windows PC - Chrome',
      success: true,
    },
    {
      timestamp: daysAgo(3),
      ip_address: '45.33.32.156',
      location: 'Unknown',
      device: 'Unknown',
      success: false,
    },
    {
      timestamp: daysAgo(5),
      ip_address: '192.168.1.100',
      location: 'New York, US',
      device: 'Windows PC - Chrome',
      success: true,
    },
  ],
};

export const DEMO_AI_MODEL_SETTINGS = {
  settings: [
    {
      purpose: 'chat',
      model_name: 'openai/gpt-4o',
      display_name: 'GPT-4o',
      description: 'Primary chat model for general conversations',
      is_active: true,
      source: 'database' as const,
    },
    {
      purpose: 'chat_fast',
      model_name: 'google/gemini-2.5-flash-lite',
      display_name: 'Gemini 2.5 Flash Lite',
      description: 'Fast lightweight model for quick responses',
      is_active: true,
      source: 'database' as const,
    },
    {
      purpose: 'embedding',
      model_name: 'openai/text-embedding-3-small',
      display_name: 'text-embedding-3-small',
      description: 'Document embedding for semantic search',
      is_active: true,
      source: 'database' as const,
    },
    {
      purpose: 'vision',
      model_name: 'openai/gpt-4o',
      display_name: 'GPT-4o (Vision)',
      description: 'Multimodal model for OCR and document analysis',
      is_active: true,
      source: 'database' as const,
    },
    {
      purpose: 'classifier',
      model_name: 'openai/gpt-4o-mini',
      display_name: 'GPT-4o Mini',
      description: 'Intent classification and routing',
      is_active: true,
      source: 'database' as const,
    },
    {
      purpose: 'reranker',
      model_name: 'cohere/rerank-english-v3.0',
      display_name: 'Cohere Rerank v3',
      description: 'RAG result reranking for improved relevance',
      is_active: true,
      source: 'database' as const,
    },
  ],
  env_defaults: {
    chat: 'openai/gpt-4o',
    chat_fast: 'google/gemini-2.5-flash-lite',
    embedding: 'openai/text-embedding-3-small',
    vision: 'openai/gpt-4o',
    classifier: 'openai/gpt-4o-mini',
    reranker: 'cohere/rerank-english-v3.0',
  },
};

export const DEMO_MODEL_CATALOG = [
  {
    id: 'cat-001',
    model_id: 'openai/gpt-4o',
    display_name: 'GPT-4o',
    provider: 'OpenAI',
    purposes: ['chat', 'vision', 'classifier'],
    is_active: true,
  },
  {
    id: 'cat-002',
    model_id: 'openai/gpt-4o-mini',
    display_name: 'GPT-4o Mini',
    provider: 'OpenAI',
    purposes: ['chat', 'chat_fast', 'classifier'],
    is_active: true,
  },
  {
    id: 'cat-003',
    model_id: 'openai/text-embedding-3-small',
    display_name: 'text-embedding-3-small',
    provider: 'OpenAI',
    purposes: ['embedding'],
    is_active: true,
  },
  {
    id: 'cat-004',
    model_id: 'anthropic/claude-3-5-sonnet-20241022',
    display_name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    purposes: ['chat', 'vision'],
    is_active: true,
  },
  {
    id: 'cat-005',
    model_id: 'anthropic/claude-3-haiku-20240307',
    display_name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    purposes: ['chat', 'chat_fast', 'classifier'],
    is_active: true,
  },
  {
    id: 'cat-006',
    model_id: 'google/gemini-2.5-flash-lite',
    display_name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    purposes: ['chat', 'chat_fast'],
    is_active: true,
  },
  {
    id: 'cat-007',
    model_id: 'google/gemini-1.5-pro',
    display_name: 'Gemini 1.5 Pro',
    provider: 'Google',
    purposes: ['chat', 'vision'],
    is_active: true,
  },
  {
    id: 'cat-008',
    model_id: 'cohere/rerank-english-v3.0',
    display_name: 'Cohere Rerank v3',
    provider: 'Cohere',
    purposes: ['reranker'],
    is_active: true,
  },
];

// Combined settings object for single fetch
export const DEMO_ALL_SETTINGS = {
  profile: DEMO_USER_PROFILE,
  notifications: DEMO_NOTIFICATION_SETTINGS,
  api_keys: DEMO_API_KEYS,
  billing: DEMO_BILLING_INFO,
  security: DEMO_SECURITY_SETTINGS,
};
