import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import { I18nData } from '@/models';
import { InMemoryCache, i18nCacheKeys } from '@/utils/cache';
import { i18nKeys } from '@/utils/dynamo';
import { getLogger } from '@/config/logger';

const logger = getLogger();

export class I18nService {
  private readonly cache = new InMemoryCache<I18nData>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName
  ) {}

  async getTranslations(appId: string, locale: string): Promise<Record<string, string>> {
    const cacheKey = i18nCacheKeys.translations(appId, locale);
    
    logger.debug({ appId, locale, cacheKey }, 'Getting translations');
    
    // Check cache first
    const cachedData = await this.cache.get(cacheKey);
    if (cachedData) {
      logger.debug({ appId, locale }, 'Translations found in cache');
      return cachedData.translations;
    }

    try {
      logger.debug({ appId, locale }, 'Loading translations from DynamoDB');
      const translations = await this.loadTranslationsFromDynamoDB(appId, locale);
            
      // Cache the result
      const i18nData: I18nData = {
        locale,
        appId,
        translations,
        version: `v${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      
      await this.cache.set(cacheKey, i18nData, this.cacheTTL);
      logger.debug({ appId, locale, translationCount: Object.keys(translations).length }, 'Translations cached');
      
      return translations;
    } catch (error) {
      logger.error({ appId, locale, error }, 'Failed to load translations');
      return {}; // Return empty object if not found
    }
  }

  private async loadTranslationsFromDynamoDB(appId: string, locale: string): Promise<Record<string, string>> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: i18nKeys.partitionKey(appId),
        SK: i18nKeys.sortKey(locale),
      },
    });

    const result = await this.docClient.send(command);
    
    if (!result.Item) {
      throw new Error(`No translations found for ${appId}:${locale}`);
    }

    return result.Item.translations as Record<string, string>;
  }

  // Method to preload translations for better performance
  async preloadTranslations(appId: string, locales: string[]): Promise<void> {
    logger.info({ appId, locales }, 'Preloading translations');
    
    const promises = locales.map(locale => 
      this.getTranslations(appId, locale).catch(error => 
        logger.error({ appId, locale, error }, 'Failed to preload translations')
      )
    );
    
    await Promise.allSettled(promises);
    logger.info({ appId, localeCount: locales.length }, 'Preloading translations completed');
  }

  // Method to preload all translations for an app (more efficient than individual calls)
  async preloadAllTranslations(appId: string): Promise<void> {
    try {
      logger.info({ appId }, 'Preloading all translations for app');
      
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': i18nKeys.partitionKey(appId),
        },
      });

      const result = await this.docClient.send(command);
      const items = result.Items || [];

      // Cache all translations
      for (const item of items) {
        const locale = item.SK as string;
        const cacheKey = i18nCacheKeys.translations(appId, locale);
        
        const i18nData: I18nData = {
          locale,
          appId,
          translations: item.translations as Record<string, string>,
          version: item.version as string,
          lastUpdated: item.lastUpdated as string,
        };
        
        await this.cache.set(cacheKey, i18nData, this.cacheTTL);
      }

      logger.info({ appId, translationSets: items.length }, 'Preloaded all translations for app');
    } catch (error) {
      logger.error({ appId, error }, 'Failed to preload all translations');
      throw error;
    }
  }

  // Method to clear cache (useful for testing or manual refresh)
  async clearCache(appId?: string, locale?: string): Promise<void> {
    if (appId && locale) {
      const key = i18nCacheKeys.translations(appId, locale);
      await this.cache.delete(key);
      logger.info({ appId, locale }, 'Cleared translation cache');
    } else if (appId) {
      // Clear all translations for an app - need to get pattern
      const pattern = i18nCacheKeys.translations(appId, '*');
      const keys = await this.cache.keys(pattern);
      for (const key of keys) {
        await this.cache.delete(key);
      }
      logger.info({ appId, clearedKeys: keys.length }, 'Cleared app translation cache');
    } else {
      await this.cache.clear();
      logger.info('Cleared all translation cache');
    }
  }

  // Method to get cached translation info (for debugging)
  async getCacheInfo(): Promise<Array<{ key: string; hasData: boolean }>> {
    const keys = await this.cache.keys('translations:*');
    const info: Array<{ key: string; hasData: boolean }> = [];
    
    for (const key of keys) {
      const hasData = await this.cache.has(key);
      info.push({ key, hasData });
    }
    
    return info;
  }

  // Method to store translations in DynamoDB
  async storeTranslations(appId: string, locale: string, translations: Record<string, string>): Promise<void> {
    const now = new Date().toISOString();
    const version = `v${Date.now()}`;

    logger.info({ appId, locale, translationCount: Object.keys(translations).length }, 'Storing translations');

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: i18nKeys.partitionKey(appId),
        SK: i18nKeys.sortKey(locale),
        appId,
        locale,
        translations,
        version,
        lastUpdated: now,
        // Add GSI keys for querying by app or locale if needed
        GSI1PK: i18nKeys.gsi1PartitionKey(locale),
        GSI1SK: i18nKeys.gsi1SortKey(appId),
      },
    });

    await this.docClient.send(command);

    // Update cache
    const cacheKey = i18nCacheKeys.translations(appId, locale);
    const i18nData: I18nData = {
      locale,
      appId,
      translations,
      version,
      lastUpdated: now,
    };
    
    await this.cache.set(cacheKey, i18nData, this.cacheTTL);
    logger.info({ appId, locale }, 'Translations stored and cached');
  }

  // Method to get all available locales for an app
  async getAvailableLocales(appId: string): Promise<string[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': i18nKeys.partitionKey(appId),
      },
      ProjectionExpression: 'SK',
    });

    const result = await this.docClient.send(command);
    
    return (result.Items || []).map((item: any) => item.SK as string);
  }

  // Method to delete translations for a specific locale
  async deleteTranslations(appId: string, locale: string): Promise<void> {
    logger.info({ appId, locale }, 'Deleting translations');
    
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: i18nKeys.partitionKey(appId),
        SK: i18nKeys.sortKey(locale),
      },
    });

    await this.docClient.send(command);

    // Clear from cache
    const cacheKey = i18nCacheKeys.translations(appId, locale);
    await this.cache.delete(cacheKey);
    
    logger.info({ appId, locale }, 'Translations deleted');
  }

  // Method to get translation metadata (without the actual translations)
  async getTranslationMetadata(appId: string, locale: string): Promise<{ version: string; lastUpdated: string } | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: i18nKeys.partitionKey(appId),
        SK: i18nKeys.sortKey(locale),
      },
      ProjectionExpression: 'version, lastUpdated',
    });

    const result = await this.docClient.send(command);
    
    if (!result.Item) {
      return null;
    }

    return {
      version: result.Item.version as string,
      lastUpdated: result.Item.lastUpdated as string,
    };
  }
}
