import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import { I18nData } from '@/models';

export class I18nService {
  private readonly cache = new Map<string, I18nData>();
  private readonly cacheExpiry = new Map<string, number>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName
  ) {}

  async getTranslations(appId: string, locale: string): Promise<Record<string, string>> {
    const cacheKey = `${appId}:${locale}`;
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey)!.translations;
    }

    try {
      const translations = await this.loadTranslationsFromDynamoDB(appId, locale);
            
      // Cache the result
      const i18nData: I18nData = {
        locale,
        appId,
        translations,
        version: `v${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      
      this.cache.set(cacheKey, i18nData);
      this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);
      
      return translations;
    } catch (error) {
      console.error(`Failed to load translations for ${appId}:${locale}`, error);
      return {}; // Return empty object if not found
    }
  }

  private async loadTranslationsFromDynamoDB(appId: string, locale: string): Promise<Record<string, string>> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `I18N#${appId}`,
        SK: locale,
      },
    });

    const result = await this.docClient.send(command);
    
    if (!result.Item) {
      throw new Error(`No translations found for ${appId}:${locale}`);
    }

    return result.Item.translations as Record<string, string>;
  }

  private isValidCache(key: string): boolean {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    return !!(cached && expiry && Date.now() < expiry);
  }

  // Method to preload translations for better performance
  async preloadTranslations(appId: string, locales: string[]): Promise<void> {
    const promises = locales.map(locale => 
      this.getTranslations(appId, locale).catch(error => 
        console.error(`Failed to preload translations for ${appId}:${locale}`, error)
      )
    );
    
    await Promise.allSettled(promises);
  }

  // Method to preload all translations for an app (more efficient than individual calls)
  async preloadAllTranslations(appId: string): Promise<void> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `I18N#${appId}`,
        },
      });

      const result = await this.docClient.send(command);
      const items = result.Items || [];

      // Cache all translations
      for (const item of items) {
        const locale = item.SK as string;
        const cacheKey = `${appId}:${locale}`;
        
        const i18nData: I18nData = {
          locale,
          appId,
          translations: item.translations as Record<string, string>,
          version: item.version as string,
          lastUpdated: item.lastUpdated as string,
        };
        
        this.cache.set(cacheKey, i18nData);
        this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);
      }

      console.log(`Preloaded ${items.length} translation sets for app ${appId}`);
    } catch (error) {
      console.error(`Failed to preload all translations for ${appId}`, error);
      throw error;
    }
  }

  // Method to clear cache (useful for testing or manual refresh)
  clearCache(appId?: string, locale?: string): void {
    if (appId && locale) {
      const key = `${appId}:${locale}`;
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  // Method to get cached translation info (for debugging)
  getCacheInfo(): Array<{ key: string; expiresAt: number; size: number }> {
    const info: Array<{ key: string; expiresAt: number; size: number }> = [];
    
    for (const [key, data] of this.cache.entries()) {
      const expiresAt = this.cacheExpiry.get(key) || 0;
      info.push({
        key,
        expiresAt,
        size: JSON.stringify(data.translations).length,
      });
    }
    
    return info;
  }

  // Method to store translations in DynamoDB
  async storeTranslations(appId: string, locale: string, translations: Record<string, string>): Promise<void> {
    const now = new Date().toISOString();
    const version = `v${Date.now()}`;

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `I18N#${appId}`,
        SK: locale,
        appId,
        locale,
        translations,
        version,
        lastUpdated: now,
        // Add GSI keys for querying by app or locale if needed
        GSI1PK: `I18N#${appId}`,
        GSI1SK: `LOCALE#${locale}`,
      },
    });

    await this.docClient.send(command);

    // Update cache
    const cacheKey = `${appId}:${locale}`;
    const i18nData: I18nData = {
      locale,
      appId,
      translations,
      version,
      lastUpdated: now,
    };
    
    this.cache.set(cacheKey, i18nData);
    this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);
  }

  // Method to get all available locales for an app
  async getAvailableLocales(appId: string): Promise<string[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `I18N#${appId}`,
      },
      ProjectionExpression: 'SK',
    });

    const result = await this.docClient.send(command);
    
    return (result.Items || []).map((item: any) => item.SK as string);
  }

  // Method to delete translations for a specific locale
  async deleteTranslations(appId: string, locale: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `I18N#${appId}`,
        SK: locale,
      },
    });

    await this.docClient.send(command);

    // Clear from cache
    const cacheKey = `${appId}:${locale}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  // Method to get translation metadata (without the actual translations)
  async getTranslationMetadata(appId: string, locale: string): Promise<{ version: string; lastUpdated: string } | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `I18N#${appId}`,
        SK: locale,
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
