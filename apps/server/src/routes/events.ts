import Router from '@koa/router';
import { format } from 'date-fns';
import { EventService } from '@/services/event-service';
import { CreateEventRequest } from '@/models/event';
import { ApiResponse } from '@/models';

const router = new Router();
const eventService = new EventService();

// POST /api/events - Store new event
router.post('/', async (ctx) => {
  try {
    const eventData = ctx.request.body as CreateEventRequest;

    if (!eventData || !eventData.appId || !eventData.userId || !eventData.eventKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required fields: appId, userId, eventKey',
        timestamp: new Date().toISOString(),
      };
      return;
    }

    const event = await eventService.createEvent(eventData);
    
    const response: ApiResponse = {
      success: true,
      data: event,
      message: 'Event stored successfully',
      timestamp: new Date().toISOString(),
    };
    
    ctx.status = 201;
    ctx.body = response;
  } catch (error) {
    console.error('Error storing event:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to store event',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /api/events/:appId/:userId/:day - Get all events for user/app/day
router.get('/:appId/:userId/:day', async (ctx) => {
  try {
    const { appId, userId, day } = ctx.params;
    
    if (!appId || !userId || !day) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, userId, day',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const events = await eventService.getUserEvents(appId, userId, day);
    
    const response: ApiResponse = {
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching events:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch events',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /api/events/:appId/:userId/:day/:eventKey - Get specific event
router.get('/:appId/:userId/:day/:eventKey', async (ctx) => {
  try {
    const { appId, userId, day, eventKey } = ctx.params;
    
    if (!appId || !userId || !day || !eventKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, userId, day, eventKey',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const event = await eventService.getEvent(appId, userId, day, eventKey);
    
    if (!event) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: 'Event not found',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      data: event,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching event:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch event',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /api/events/:appId/:userId - Get events for today (convenience endpoint)
router.get('/:appId/:userId', async (ctx) => {
  try {
    const { appId, userId } = ctx.params;
    
    if (!appId || !userId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, userId',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const events = await eventService.getUserEvents(appId, userId, today);
    
    const response: ApiResponse = {
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching events:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch events',
      timestamp: new Date().toISOString(),
    };
  }
});

export { router as eventRoutes };
