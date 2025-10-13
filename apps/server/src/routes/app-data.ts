import Router from '@koa/router';
import { AppDataService } from '@/domains/app/app-service';
import { UpdateAppDataRequest } from '@/domains/app/app';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/api';
import { getCurrentDay } from '@/utils/date';

const router = new Router();
const appDataService = new AppDataService();


/**
// GET /app-data/:appId/:day - Get all app data for day
// GET /app-data/:appId - Get app data for today (convenience endpoint)
// POST /app-data/:appId/:day/:key - Update app data (admin endpoint)
// POST /app-data/:appId/:day - Bulk update app data

// POST /events/:appId - Store new event
// GET /events/:appId/:day - Get all events for user/app/day
// GET /events/:appId/:day/:eventKey - Get specific event for user
// GET /events/:appId - Get events for today (convenience endpoint) for authenticated user

->

// GET /apps/:appId

/// App data
/apps/:appId/data?version=latest
- APP level - Versioned, runner data
  - Functions
  - Assets
  - Localization
/apps/:appId/
- APP level - Instanced, runner data
  - Daily challenges
  - Validations
  - Leaderboards


- USER level - App configuration
  - Settings
  - Authentication/authorization?
  - Event information

- USER level - App usage instance
  - Session information
  - Daily score

/// Events
- MULTI-USER level - multi-player sessions

- USER level - App usage instance
  - User actually using an app

- USER level - long-running
  - Webhook. Should this start an instance?

- GLOBAL level
  - Unrelated to a user?

--> AGGREGATIONS

Some way to tick over a clock and run an aggregation on data
- Leaderboards
- Want this to be very thin, though...developers should be able to run this themselves

 */


/**

MCPs / WASI

- Cache

- Storage
  - SQL
  - Document?

- Pub/sub

 */

// GET /app-data/:appId/:day - Get all app data for day
router.get('/:appId/:day', async (ctx) => {
  try {
    const { appId, day } = ctx.params;
    
    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }
    
    const data = await appDataService.getAppData({ appId, day });
    
    sendSuccessResponse(ctx, 200, data);
  } catch (error) {
    console.error('Error fetching app data:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch app data');
  }
});

// GET /app-data/:appId - Get app data for today (convenience endpoint)
router.get('/:appId', async (ctx) => {
  try {
    const { appId } = ctx.params;
    
    if (!appId) {
      sendErrorResponse(ctx, 400, 'Missing required parameter: appId');
      return;
    }
    
    const data = await appDataService.getAppData({ appId, day: getCurrentDay() });
    
    sendSuccessResponse(ctx, 200, data);
  } catch (error) {
    console.error('Error fetching app data:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch app data');
  }
});

// POST /app-data/:appId/:day/:key - Update app data (admin endpoint)
router.post('/:appId/:day/:key', async (ctx) => {
  try {
    const { appId, day, key } = ctx.params;
    const { value, version } = ctx.request.body as { value: unknown; version?: string };
    
    if (!appId || !day || !key) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day, key');
      return;
    }
    
    if (value === undefined) {
      sendErrorResponse(ctx, 400, 'Missing required field: value');
      return;
    }
    
    const updateRequest: UpdateAppDataRequest = {
      appId,
      day,
      key,
      value,
      ...(version && { version }),
    };
    
    const appData = await appDataService.updateAppData(updateRequest);
    
    sendSuccessResponse(ctx, 201, appData, 'App data updated successfully');
  } catch (error) {
    console.error('Error updating app data:', error);
    sendErrorResponse(ctx, 500, 'Failed to update app data');
  }
});

// POST /app-data/:appId/:day - Bulk update app data
router.post('/:appId/:day', async (ctx) => {
  try {
    const { appId, day } = ctx.params;
    const data = ctx.request.body as Record<string, unknown>;
    
    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }
    
    if (!data || typeof data !== 'object') {
      sendErrorResponse(ctx, 400, 'Invalid data format - expected object with key-value pairs');
      return;
    }
    
    const results = await appDataService.bulkUpdateAppData(appId, day, data);
    
    sendSuccessResponse(ctx, 201, results, `Updated ${results.length} app data entries`);
  } catch (error) {
    console.error('Error bulk updating app data:', error);
    sendErrorResponse(ctx, 500, 'Failed to bulk update app data');
  }
});

export { router as appDataRoutes };
