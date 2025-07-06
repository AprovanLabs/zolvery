/**
 * Validation utilities without external dependencies
 */

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface ValidationRule<T = any> {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly T[];
  custom?: (value: any) => boolean | string;
}

/**
 * Simple validation function
 */
export const validate = <T = any>(
  data: any,
  rules: ValidationRule[]
): ValidationResult<T> => {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    // Skip validation if field is not required and value is empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${rule.field} must be of type ${rule.type}`);
        continue;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${rule.field} must be at most ${rule.max}`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (typeof result === 'string') {
        errors.push(result);
      } else if (!result) {
        errors.push(`${rule.field} is invalid`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors[0] || 'Validation failed',
      errors,
    };
  }

  return {
    success: true,
    data: data as T,
  };
};

/**
 * Common validation rules
 */
export const commonRules = {
  id: { field: 'id', required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
  userId: { field: 'userId', required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
  appId: { field: 'appId', required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
  day: { 
    field: 'day', 
    required: true, 
    type: 'string' as const, 
    pattern: /^\d{4}-\d{2}-\d{2}$/ 
  },
  timestamp: { 
    field: 'timestamp', 
    required: true, 
    type: 'string' as const, 
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ 
  },
  email: { 
    field: 'email', 
    required: true, 
    type: 'string' as const, 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
  },
  username: { field: 'username', required: true, type: 'string' as const, minLength: 2, maxLength: 50 },
  locale: { 
    field: 'locale', 
    required: true, 
    type: 'string' as const, 
    pattern: /^[a-z]{2}(-[A-Z]{2})?$/ 
  },
  score: { field: 'score', required: true, type: 'number' as const },
  eventKey: { field: 'eventKey', required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
};

/**
 * Validation rule sets for different data types
 */
export const validationRuleSets = {
  userProfile: [
    commonRules.id,
    commonRules.userId,
    commonRules.username,
    commonRules.email,
    { field: 'groups', required: false, type: 'array' as const },
    { field: 'preferences', required: false, type: 'object' as const },
    commonRules.timestamp,
    { ...commonRules.timestamp, field: 'updatedAt' },
  ],

  appConfig: [
    commonRules.id,
    commonRules.appId,
    { field: 'name', required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
    { field: 'description', required: false, type: 'string' as const, maxLength: 1000 },
    { field: 'settings', required: false, type: 'object' as const },
    { field: 'status', required: true, type: 'string' as const, enum: ['active', 'inactive', 'maintenance'] },
    commonRules.timestamp,
    { ...commonRules.timestamp, field: 'updatedAt' },
  ],

  appEvent: [
    commonRules.id,
    commonRules.eventKey,
    { field: 'value', required: true },
    commonRules.appId,
    commonRules.userId,
    commonRules.day,
    commonRules.timestamp,
    { field: 'ttl', required: false, type: 'number' as const, min: 0 },
    { ...commonRules.timestamp, field: 'createdAt' },
    { ...commonRules.timestamp, field: 'updatedAt' },
  ],

  leaderboardEntry: [
    commonRules.id,
    commonRules.appId,
    commonRules.userId,
    commonRules.username,
    commonRules.score,
    commonRules.day,
    { field: 'rank', required: false, type: 'number' as const, min: 1 },
    { field: 'metadata', required: false, type: 'object' as const },
    commonRules.timestamp,
    { ...commonRules.timestamp, field: 'updatedAt' },
  ],

  translationSet: [
    commonRules.id,
    commonRules.appId,
    commonRules.locale,
    { field: 'translations', required: true, type: 'object' as const },
    { field: 'lastUpdated', required: true, type: 'string' as const },
    commonRules.timestamp,
    { ...commonRules.timestamp, field: 'updatedAt' },
  ],
};
