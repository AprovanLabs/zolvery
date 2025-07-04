export interface I18nData {
  locale: string;
  appId?: string;
  translations: Record<string, string>;
  version: string;
  lastUpdated: string;
}

export interface I18nResponse {
  success: boolean;
  translations?: Record<string, string>;
  locale?: string;
  version?: string;
  error?: string;
  timestamp: string;
}

// Common API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}
