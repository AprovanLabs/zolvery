import Router from '@koa/router';
import { I18nService } from '@/services/i18n-service';
import { ApiResponse } from '@/models';

const router = new Router();
const i18nService = new I18nService();

// GET /api/i18n/:appId/:locale - Get localized strings for app
router.get('/:appId/:locale', async (ctx) => {
  try {
    const { appId, locale } = ctx.params;
    
    if (!appId || !locale) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, locale',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const translations = await i18nService.getTranslations(appId, locale);
    
    const response: ApiResponse = {
      success: true,
      data: {
        translations,
        locale,
        appId,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching app translations:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch app translations',
      timestamp: new Date().toISOString(),
    };
  }
});

export { router as i18nRoutes };
