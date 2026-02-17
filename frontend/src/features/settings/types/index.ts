/**
 * AI Model Settings types
 */

export interface AIModelSetting {
  purpose: string;
  model_name: string;
  display_name?: string | null;
  description?: string | null;
  is_active: boolean;
  source: 'database' | 'env_default';
}

export interface AIModelSettingsResponse {
  settings: AIModelSetting[];
  env_defaults: Record<string, string>;
}

export interface ModelCatalogEntry {
  model_id: string;
  display_name: string;
  provider: string;
  purposes: string[];
}

export interface UpdateAIModelSettingRequest {
  model_name: string;
  display_name?: string;
}
