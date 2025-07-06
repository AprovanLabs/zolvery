import Router from '@koa/router';
import { format } from 'date-fns';
import { EventService } from '@/services/event-service';
import { CreateEventRequest } from '@/models/event';
import { eventLogger, logError, logSuccess } from '@/config/logger';
import { LogContext } from '@/middleware/logger';
import {
  sendErrorResponse,
  sendSuccessResponse,
  validateAuth,
} from '@/utils/api';

const router = new Router();
const eventService = new EventService();

// POST /events/:appId - Store new event
router.post('/:appId', async (ctx: LogContext) => {
  const requestId = ctx.requestId;

  try {
    const { appId } = ctx.params;
    const eventData = ctx.request.body as any;

    const user = validateAuth(ctx);
    if (!user) return;

    eventLogger.info(
      {
        requestId,
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

    logSuccess(eventLogger, 'Event created successfully', {
      requestId,
      PK: event.PK,
      SK: event.SK,
      appId: event.appId,
      userId: event.userId,
      eventKey: event.eventKey,
    });

    sendSuccessResponse(ctx, 201, event, 'Event stored successfully');
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      eventData: ctx.request.body,
    });

    sendErrorResponse(ctx, 500, 'Failed to store event');
  }
});

// GET /events/:appId/:day - Get all events for authenticated user/app/day
router.get('/:appId/:day', async (ctx: LogContext) => {
  const requestId = ctx.requestId;

  try {
    const { appId, day } = ctx.params;

    const user = validateAuth(ctx);
    if (!user) return;

    const userId = user.userId;

    eventLogger.info(
      {
        requestId,
        appId,
        userId,
        day,
      },
      'Fetching user events',
    );

    if (!appId || !day) {
      eventLogger.warn(
        {
          requestId,
          params: { appId, day },
        },
        'Missing required parameters',
      );

      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }

    const events = await eventService.getUserEvents(appId, userId, day);

    logSuccess(eventLogger, 'User events retrieved successfully', {
      requestId,
      appId,
      userId,
      day,
      eventCount: events.length,
    });

    sendSuccessResponse(ctx, 200, events);
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      params: ctx.params,
    });

    sendErrorResponse(ctx, 500, 'Failed to fetch events');
  }
});

// GET /events/:appId/:day/:eventKey - Get specific event for authenticated user
router.get('/:appId/:day/:eventKey', async (ctx: LogContext) => {
  const requestId = ctx.requestId;

  try {
    const { appId, day, eventKey } = ctx.params;

    const user = validateAuth(ctx);
    if (!user) return;

    const userId = user.userId;

    eventLogger.info(
      {
        requestId,
        appId,
        userId,
        day,
        eventKey,
      },
      'Fetching specific event',
    );

    if (!appId || !day || !eventKey) {
      eventLogger.warn(
        {
          requestId,
          params: { appId, day, eventKey },
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

    const event = await eventService.getEvent(appId, userId, day, eventKey);

    if (!event) {
      eventLogger.info(
        {
          requestId,
          appId,
          userId,
          day,
          eventKey,
        },
        'Event not found',
      );

      sendErrorResponse(ctx, 404, 'Event not found');
      return;
    }

    logSuccess(eventLogger, 'Specific event retrieved successfully', {
      requestId,
      appId,
      userId,
      day,
      eventKey,
    });

    sendSuccessResponse(ctx, 200, event);
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      params: ctx.params,
    });
    sendErrorResponse(ctx, 500, 'Failed to fetch event');
  }
});

// GET /events/:appId - Get events for today (convenience endpoint) for authenticated user
router.get('/:appId', async (ctx: LogContext) => {
  const requestId = ctx.requestId;

  try {
    const { appId } = ctx.params;

    const user = validateAuth(ctx);
    if (!user) return;

    const userId = user.userId;

    eventLogger.info(
      {
        requestId,
        appId,
        userId,
      },
      "Fetching today's events",
    );

    if (!appId) {
      eventLogger.warn(
        {
          requestId,
          params: { appId },
        },
        "Missing required parameters for today's events",
      );

      sendErrorResponse(ctx, 400, 'Missing required parameters: appId');
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const events = await eventService.getUserEvents(appId, userId, today);

    logSuccess(eventLogger, "Today's events retrieved successfully", {
      requestId,
      appId,
      userId,
      day: today,
      eventCount: events.length,
    });

    sendSuccessResponse(ctx, 200, events);
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      params: ctx.params,
    });

    sendErrorResponse(ctx, 500, 'Failed to fetch events');
  }
});

export { router as eventRoutes };
