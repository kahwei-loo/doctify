/**
 * Mock authentication data for demo mode
 */

export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@doctify.ai',
  name: 'Demo User',
  created_at: '2024-01-01T00:00:00Z',
  is_active: true,
  is_verified: true,
  role: 'user',
};

export const DEMO_TOKEN = {
  access_token: 'demo_access_token_' + Math.random().toString(36).substring(7),
  token_type: 'bearer',
  expires_in: 3600,
};

export const DEMO_AUTH_RESPONSE = {
  user: DEMO_USER,
  ...DEMO_TOKEN,
};
