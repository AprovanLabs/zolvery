import Router from '@koa/router';
import { format } from 'date-fns';
import { AppDataService } from '@/services/app-service';
import { UpdateAppDataRequest } from '@/models/app';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/api';

const router = new Router();
const appDataService = new AppDataService();

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
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const data = await appDataService.getAppData({ appId, day: today });
    
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
