import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { appConfig } from '@/config';
import { I18nData } from '@/models';

export class I18nService {
  private readonly bucketName: string;
  private readonly cache = new Map<string, I18nData>();
  private readonly cacheExpiry = new Map<string, number>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly s3Client: S3Client = new S3Client({ region: appConfig.s3.region }),
  ) {
    this.bucketName = appConfig.s3.i18nBucket;
  }

  async getTranslations(appId: string, locale: string): Promise<Record<string, string>> {
    const cacheKey = `${appId}:${locale}`;
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey)!.translations;
    }

    try {
      const translations = await this.loadTranslationsFromS3(`${appId}/${locale}.json`);
            
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
      
      // Try to get common translations only
      try {
        const commonTranslations = await this.loadTranslationsFromS3(`common/${locale}.json`);
        return commonTranslations;
      } catch (commonError) {
        console.error(`Failed to load common translations for ${locale}`, commonError);
        return {};
      }
    }
  }

  async getCommonTranslations(locale: string): Promise<Record<string, string>> {
    const cacheKey = `common:${locale}`;
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey)!.translations;
    }

    try {
      const translations = await this.loadTranslationsFromS3(`common/${locale}.json`);
      
      // Cache the result
      const i18nData: I18nData = {
        locale,
        translations,
        version: `v${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      
      this.cache.set(cacheKey, i18nData);
      this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);
      
      return translations;
    } catch (error) {
      console.error(`Failed to load common translations for ${locale}`, error);
      return {};
    }
  }

  private async loadTranslationsFromS3(key: string): Promise<Record<string, string>> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error(`No content found for key: ${key}`);
    }

    const content = await response.Body.transformToString();
    return JSON.parse(content);
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
}
