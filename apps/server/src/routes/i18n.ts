import Router from '@koa/router';
import { I18nService } from '@/services/i18n-service';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/api';

const router = new Router();
const i18nService = new I18nService();

// GET /i18n/:appId/:locale - Get localized strings for app
router.get('/:appId/:locale', async (ctx) => {
  try {
    const { appId, locale } = ctx.params;

    if (!appId || !locale) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, locale');
      return;
    }

    const translations = await i18nService.getTranslations(appId, locale);

    sendSuccessResponse(ctx, 200, {
      translations,
      locale,
      appId,
    });
  } catch (error) {
    console.error('Error fetching app translations:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch app translations');
  }
});

// POST /i18n/:appId/:locale - Store localized strings for app
router.post('/:appId/:locale', async (ctx) => {
  try {
    const { appId, locale } = ctx.params;
    const { translations } = ctx.request.body as {
      translations: Record<string, string>;
    };

    if (!appId || !locale) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, locale');
      return;
    }

    if (!translations || typeof translations !== 'object') {
      sendErrorResponse(ctx, 400, 'Missing or invalid translations object');
      return;
    }

    await i18nService.storeTranslations(appId, locale, translations);

    sendSuccessResponse(ctx, 201, {
      message: 'Translations stored successfully',
      locale,
      appId,
    });
  } catch (error) {
    console.error('Error storing app translations:', error);
    sendErrorResponse(ctx, 500, 'Failed to store app translations');
  }
});

// GET /i18n/:appId/locales - Get available locales for app
router.get('/:appId/locales', async (ctx) => {
  try {
    const { appId } = ctx.params;

    if (!appId) {
      sendErrorResponse(ctx, 400, 'Missing required parameter: appId');
      return;
    }

    const locales = await i18nService.getAvailableLocales(appId);

    sendSuccessResponse(ctx, 200, {
      locales,
      appId,
    });
  } catch (error) {
    console.error('Error fetching available locales:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch available locales');
  }
});

// DELETE /i18n/:appId/:locale - Delete localized strings for app
router.delete('/:appId/:locale', async (ctx) => {
  try {
    const { appId, locale } = ctx.params;

    if (!appId || !locale) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, locale');
      return;
    }

    await i18nService.deleteTranslations(appId, locale);

    sendSuccessResponse(ctx, 200, {
      message: 'Translations deleted successfully',
      locale,
      appId,
    });
  } catch (error) {
    console.error('Error deleting app translations:', error);
    sendErrorResponse(ctx, 500, 'Failed to delete app translations');
  }
});

// GET /i18n/:appId/:locale/metadata - Get translation metadata
router.get('/:appId/:locale/metadata', async (ctx) => {
  try {
    const { appId, locale } = ctx.params;

    if (!appId || !locale) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, locale');
      return;
    }

    const metadata = await i18nService.getTranslationMetadata(appId, locale);

    if (!metadata) {
      sendErrorResponse(ctx, 404, 'Translations not found');
      return;
    }

    sendSuccessResponse(ctx, 200, {
      ...metadata,
      locale,
      appId,
    });
  } catch (error) {
    console.error('Error fetching translation metadata:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch translation metadata');
  }
});

export { router as i18nRoutes };
