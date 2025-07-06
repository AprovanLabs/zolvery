import Router from '@koa/router';
import { format } from 'date-fns';
import { EventService } from '@/services/event-service';
import { CreateEventRequest } from '@/models/event';
import { ApiResponse } from '@/models';
import { eventLogger, logError, logSuccess } from '@/config/logger';
import { AuthContext } from '@/middleware/auth';
import { LogContext } from '@/middleware/logger';

const router = new Router();
const eventService = new EventService();

// POST /events - Store new event
router.post('/', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const eventData = ctx.request.body as CreateEventRequest;

    eventLogger.info({
      requestId,
      eventData: {
        appId: eventData?.appId,
        userId: authCtx.user?.userId,
        eventKey: eventData?.eventKey,
      },
    }, 'Creating new event');

    if (!eventData || !eventData.appId || !eventData.eventKey || !authCtx.user) {
      eventLogger.warn({
        requestId,
        receivedData: eventData,
        hasUser: !!authCtx.user,
      }, 'Invalid event data received');
      
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required fields: appId, eventKey, or user not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const event = await eventService.createEvent(authCtx.user.userId, eventData);
    
    logSuccess(eventLogger, 'Event created successfully', {
      requestId,
      PK: event.PK,
      SK: event.SK,
      appId: event.appId,
      userId: event.userId,
      eventKey: event.eventKey,
    });
    
    const response: ApiResponse = {
      success: true,
      data: event,
      message: 'Event stored successfully',
      timestamp: new Date().toISOString(),
    };
    
    ctx.status = 201;
    ctx.body = response;
  } catch (error) {
    eventLogger.error
    logError(eventLogger, error as Error, {
      requestId,
      eventData: ctx.request.body,
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to store event',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

// GET /events/:appId/:day - Get all events for authenticated user/app/day
router.get('/:appId/:day', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const { appId, day } = ctx.params;
    
    if (!authCtx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const userId = authCtx.user.sub;
    
    eventLogger.info({
      requestId,
      appId,
      userId,
      day,
    }, 'Fetching user events');
    
    if (!appId || !day) {
      eventLogger.warn({
        requestId,
        params: { appId, day },
      }, 'Missing required parameters');
      
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, day',
        timestamp: new Date().toISOString(),
        requestId,
      };
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
    
    const response: ApiResponse = {
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      params: ctx.params,
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch events',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

// GET /events/:appId/:day/:eventKey - Get specific event for authenticated user
router.get('/:appId/:day/:eventKey', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const { appId, day, eventKey } = ctx.params;
    
    if (!authCtx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const userId = authCtx.user.sub;
    
    eventLogger.info({
      requestId,
      appId,
      userId,
      day,
      eventKey,
    }, 'Fetching specific event');
    
    if (!appId || !day || !eventKey) {
      eventLogger.warn({
        requestId,
        params: { appId, day, eventKey },
      }, 'Missing required parameters for specific event');
      
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, day, eventKey',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }
    
    const event = await eventService.getEvent(appId, userId, day, eventKey);
    
    if (!event) {
      eventLogger.info({
        requestId,
        appId,
        userId,
        day,
        eventKey,
      }, 'Event not found');
      
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: 'Event not found',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }
    
    logSuccess(eventLogger, 'Specific event retrieved successfully', {
      requestId,
      appId,
      userId,
      day,
      eventKey,
    });
    
    const response: ApiResponse = {
      success: true,
      data: event,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      params: ctx.params,
    });
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch event',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

// GET /events/:appId - Get events for today (convenience endpoint) for authenticated user
router.get('/:appId', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const { appId } = ctx.params;
    
    if (!authCtx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const userId = authCtx.user.sub;
    
    eventLogger.info({
      requestId,
      appId,
      userId,
    }, 'Fetching today\'s events');
    
    if (!appId) {
      eventLogger.warn({
        requestId,
        params: { appId },
      }, 'Missing required parameters for today\'s events');
      
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const events = await eventService.getUserEvents(appId, userId, today);
    
    logSuccess(eventLogger, 'Today\'s events retrieved successfully', {
      requestId,
      appId,
      userId,
      day: today,
      eventCount: events.length,
    });
    
    const response: ApiResponse = {
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    logError(eventLogger, error as Error, {
      requestId,
      params: ctx.params,
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch events',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

export { router as eventRoutes };
