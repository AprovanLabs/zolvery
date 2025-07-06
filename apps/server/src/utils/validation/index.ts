export type { ValidationResult, ValidationRule } from './validators';
export { validate, commonRules, validationRuleSets } from './validators';
export { validationSchemas, baseSchemas, userSchemas, appSchemas, gameSchemas, i18nSchemas, analyticsSchemas, apiSchemas, cacheSchemas, dynamoSchemas } from './schemas';

import Joi from 'joi';

/**
 * Joi validation helper with consistent error handling
 */
export interface JoiValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Joi.ValidationErrorItem[];
}

export const validateWithJoi = <T = any>(
  data: any,
  schema: Joi.Schema<T>
): JoiValidationResult<T> => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
      details: error.details,
    };
  }

  return {
    success: true,
    data: value,
  };
};
