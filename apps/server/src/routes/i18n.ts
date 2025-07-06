import Router from '@koa/router';
import { I18nService } from '@/services/i18n-service';
import { ApiResponse } from '@/models';

const router = new Router();
const i18nService = new I18nService();

// GET /i18n/:appId/:locale - Get localized strings for app
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

// POST /i18n/:appId/:locale - Store localized strings for app
router.post('/:appId/:locale', async (ctx) => {
  try {
    const { appId, locale } = ctx.params;
    const { translations } = ctx.request.body as { translations: Record<string, string> };
    
    if (!appId || !locale) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, locale',
        timestamp: new Date().toISOString(),
      };
      return;
    }

    if (!translations || typeof translations !== 'object') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing or invalid translations object',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    await i18nService.storeTranslations(appId, locale, translations);
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Translations stored successfully',
        locale,
        appId,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error storing app translations:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to store app translations',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /i18n/:appId/locales - Get available locales for app
router.get('/:appId/locales', async (ctx) => {
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
    
    const locales = await i18nService.getAvailableLocales(appId);
    
    const response: ApiResponse = {
      success: true,
      data: {
        locales,
        appId,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching available locales:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch available locales',
      timestamp: new Date().toISOString(),
    };
  }
});

// DELETE /i18n/:appId/:locale - Delete localized strings for app
router.delete('/:appId/:locale', async (ctx) => {
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
    
    await i18nService.deleteTranslations(appId, locale);
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Translations deleted successfully',
        locale,
        appId,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error deleting app translations:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to delete app translations',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /i18n/:appId/:locale/metadata - Get translation metadata
router.get('/:appId/:locale/metadata', async (ctx) => {
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
    
    const metadata = await i18nService.getTranslationMetadata(appId, locale);
    
    if (!metadata) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: 'Translations not found',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      data: {
        ...metadata,
        locale,
        appId,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching translation metadata:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch translation metadata',
      timestamp: new Date().toISOString(),
    };
  }
});

export { router as i18nRoutes };
