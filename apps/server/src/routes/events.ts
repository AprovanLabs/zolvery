import Router from '@koa/router';
import { format } from 'date-fns';
import logger from '@/logger';
import { EventService } from '@/domains/events/event-service';
import { CreateEventRequest } from '@/domains/events/event';
import {
  sendErrorResponse,
  sendSuccessResponse,
  validateAuth,
} from '@/utils/api';
import { Context } from 'koa';
import { AuthContext } from '@/auth';

const router = new Router();
const eventService = new EventService();

// POST /events/:appId - Store new event
router.post('/:appId', async (ctx: AuthContext) => {
  try {
    const { appId } = ctx.params;
    const eventData = ctx.request.body as any;
    const user = ctx.user;

    logger.info(
      {
        eventData: {
          appId,
          userId: user.userId,
          eventKey: eventData?.eventKey,
        },
      },
      'Creating new event',
    );

    const event = await eventService.createEvent(
      user.userId,
      eventData as CreateEventRequest,
    );

    logger.info('Event created successfully', {
      appId: event.appId,
      eventKey: event.eventKey,
    });

    sendSuccessResponse(ctx, 201, event, 'Event stored successfully');
  } catch (error) {
    logger.error(error as Error, {
      eventData: ctx.request.body,
    });

    sendErrorResponse(ctx, 500, 'Failed to store event');
  }
});

// GET /events/:appId/:day - Get all events for user/app/day
router.get('/:appId/:day', async (ctx: AuthContext) => {
  try {
    const { appId, day } = ctx.params;
    const userId = ctx.user.userId;

    logger.info({ appId, day }, 'Fetching user events');

    if (!appId || !day) {
      logger.warn(
        {
          params: { appId, day },
        },
        'Missing required parameters',
      );

      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }

    const events = await eventService.getUserEvents(appId, userId, day);

    logger.info('User events retrieved successfully', {
      appId,
      day,
      eventCount: events.length,
    });

    sendSuccessResponse(ctx, 200, events);
  } catch (error) {
    logger.error(error as Error, {
      params: ctx.params,
    });

    sendErrorResponse(ctx, 500, 'Failed to fetch events');
  }
});

// GET /events/:appId/:day/:eventKey - Get specific event for user
router.get('/:appId/:day/events/:key', async (ctx: Context) => {
  try {
    const { appId, day, key } = ctx.params;
    const userId = ctx.user.userId;

    logger.info(
      {
        appId,
        day,
        key,
      },
      'Fetching specific event',
    );

    if (!appId || !day || !key) {
      logger.warn(
        {
          params: { appId, day, key },
        },
        'Missing required parameters for specific event',
      );

      sendErrorResponse(
        ctx,
        400,
        'Missing required parameters: appId, day, eventKey',
      );
      return;
    }

    const event = await eventService.getEvent(appId, userId, day, key);

    if (!event) {
      logger.info(
        {
          appId,
          day,
          key,
        },
        'Event not found',
      );

      sendErrorResponse(ctx, 404, 'Event not found');
      return;
    }

    logger.info('Specific event retrieved successfully', {
      appId,
      day,
      key,
    });

    sendSuccessResponse(ctx, 200, event);
  } catch (error) {
    logger.error(error as Error, {
      params: ctx.params,
    });
    sendErrorResponse(ctx, 500, 'Failed to fetch event');
  }
});

// GET /events/:appId - Get events for today (convenience endpoint) for authenticated user
router.get('/:appId', async (ctx: Context) => {
  try {
    const { appId } = ctx.params;
    const userId = ctx.user.id;

    logger.info({ appId }, "Fetching today's events");

    if (!appId) {
      logger.warn(
        {
          params: { appId },
        },
        "Missing required parameters for today's events",
      );

      sendErrorResponse(ctx, 400, 'Missing required parameters: appId');
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const events = await eventService.getUserEvents(appId, userId, today);

    logger.info("Today's events retrieved successfully", {
      appId,
      day: today,
      eventCount: events.length,
    });

    sendSuccessResponse(ctx, 200, events);
  } catch (error) {
    logger.error(error as Error, {
      params: ctx.params,
    });

    sendErrorResponse(ctx, 500, 'Failed to fetch events');
  }
});

export { router as eventRoutes };
