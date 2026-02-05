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

// Combined settings object for single fetch
export const DEMO_ALL_SETTINGS = {
  profile: DEMO_USER_PROFILE,
  notifications: DEMO_NOTIFICATION_SETTINGS,
  api_keys: DEMO_API_KEYS,
  billing: DEMO_BILLING_INFO,
  security: DEMO_SECURITY_SETTINGS,
};
