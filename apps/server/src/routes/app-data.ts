import Router from '@koa/router';
import { format } from 'date-fns';
import { AppDataService } from '@/services/app-service';
import { AppDataRequest, UpdateAppDataRequest } from '@/models/app';
import { ApiResponse } from '@/models';

const router = new Router();
const appDataService = new AppDataService();

// GET /app-data/:appId/:day - Get all app data for day
router.get('/:appId/:day', async (ctx) => {
  try {
    const { appId, day } = ctx.params;
    
    if (!appId || !day) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, day',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const data = await appDataService.getAppData({ appId, day });
    
    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching app data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch app data',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /app-data/:appId/:day/:key - Get specific app data value
router.get('/:appId/:day/:key', async (ctx) => {
  try {
    const { appId, day, key } = ctx.params;
    
    if (!appId || !day || !key) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, day, key',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const value = await appDataService.getAppDataByKey(appId, day, key);
    
    if (value === null) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: 'App data not found',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      data: { [key]: value },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching app data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch app data',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /app-data/:appId - Get app data for today (convenience endpoint)
router.get('/:appId', async (ctx) => {
  try {
    const { appId } = ctx.params;
    
    if (!appId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameter: appId',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const data = await appDataService.getAppData({ appId, day: today });
    
    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching app data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch app data',
      timestamp: new Date().toISOString(),
    };
  }
});

// POST /app-data/:appId/:day/:key - Update app data (admin endpoint)
router.post('/:appId/:day/:key', async (ctx) => {
  try {
    const { appId, day, key } = ctx.params;
    const { value, version } = ctx.request.body as { value: any; version?: string };
    
    if (!appId || !day || !key) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, day, key',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    if (value === undefined) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required field: value',
        timestamp: new Date().toISOString(),
      };
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
    
    const response: ApiResponse = {
      success: true,
      data: appData,
      message: 'App data updated successfully',
      timestamp: new Date().toISOString(),
    };
    
    ctx.status = 201;
    ctx.body = response;
  } catch (error) {
    console.error('Error updating app data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to update app data',
      timestamp: new Date().toISOString(),
    };
  }
});

// POST /app-data/:appId/:day - Bulk update app data
router.post('/:appId/:day', async (ctx) => {
  try {
    const { appId, day } = ctx.params;
    const data = ctx.request.body as Record<string, any>;
    
    if (!appId || !day) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, day',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    if (!data || typeof data !== 'object') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Invalid data format - expected object with key-value pairs',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const results = await appDataService.bulkUpdateAppData(appId, day, data);
    
    const response: ApiResponse = {
      success: true,
      data: results,
      message: `Updated ${results.length} app data entries`,
      timestamp: new Date().toISOString(),
    };
    
    ctx.status = 201;
    ctx.body = response;
  } catch (error) {
    console.error('Error bulk updating app data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to bulk update app data',
      timestamp: new Date().toISOString(),
    };
  }
});

export { router as appDataRoutes };
