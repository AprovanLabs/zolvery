import { Context, Next } from 'koa';
import Joi from 'joi';
import { validateWithJoi } from '@/utils/validation';
import { sendErrorResponse } from '@/utils/api';
import { getLogger } from '@/config/logger';

const logger = getLogger();

/**
 * Validation middleware factory for Joi schemas
 */
export const validationMiddleware = (schema: Joi.Schema, target: 'body' | 'query' | 'params' = 'body') => {
  return async (ctx: Context, next: Next) => {
    try {
      let dataToValidate: any;
      
      switch (target) {
        case 'body':
          dataToValidate = ctx.request.body;
          break;
        case 'query':
          dataToValidate = ctx.query;
          break;
        case 'params':
          dataToValidate = ctx.params;
          break;
        default:
          dataToValidate = ctx.request.body;
      }

      const validation = validateWithJoi(dataToValidate, schema);

      if (!validation.success) {
        logger.warn({
          target,
          validationError: validation.error,
          details: validation.details,
          data: dataToValidate,
        }, 'Validation failed');

        sendErrorResponse(ctx, 400, `Validation error: ${validation.error}`);
        return;
      }

      // Attach validated data to context for use in route handlers
      ctx.state.validated = {
        ...ctx.state.validated,
        [target]: validation.data,
      };

      await next();
    } catch (error) {
      logger.error({ error, target }, 'Validation middleware error');
      sendErrorResponse(ctx, 500, 'Internal validation error');
    }
  };
};

/**
 * Combine multiple validation schemas for different targets
 */
export const validate = (schemas: {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}) => {
  return async (ctx: Context, next: Next) => {
    try {
      ctx.state.validated = {};

      // Validate body if schema provided
      if (schemas.body) {
        const validation = validateWithJoi(ctx.request.body, schemas.body);
        if (!validation.success) {
          logger.warn({
            target: 'body',
            validationError: validation.error,
            details: validation.details,
          }, 'Body validation failed');
          
          sendErrorResponse(ctx, 400, `Body validation error: ${validation.error}`);
          return;
        }
        ctx.state.validated.body = validation.data;
      }

      // Validate query if schema provided
      if (schemas.query) {
        const validation = validateWithJoi(ctx.query, schemas.query);
        if (!validation.success) {
          logger.warn({
            target: 'query',
            validationError: validation.error,
            details: validation.details,
          }, 'Query validation failed');
          
          sendErrorResponse(ctx, 400, `Query validation error: ${validation.error}`);
          return;
        }
        ctx.state.validated.query = validation.data;
      }

      // Validate params if schema provided
      if (schemas.params) {
        const validation = validateWithJoi(ctx.params, schemas.params);
        if (!validation.success) {
          logger.warn({
            target: 'params',
            validationError: validation.error,
            details: validation.details,
          }, 'Params validation failed');
          
          sendErrorResponse(ctx, 400, `Params validation error: ${validation.error}`);
          return;
        }
        ctx.state.validated.params = validation.data;
      }

      await next();
    } catch (error) {
      logger.error({ error }, 'Validation middleware error');
      sendErrorResponse(ctx, 500, 'Internal validation error');
    }
  };
};
