import { CacheItem, CacheMetadata, CacheStats } from './types';

/**
 * Generic cache interface
 */
export interface Cache<T = any> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  stats(): Promise<CacheStats>;
}

/**
 * In-memory cache implementation
 */
export class InMemoryCache<T = any> implements Cache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private cacheStats: CacheStats = { hits: 0, misses: 0, size: 0 };

  public async get(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if expired
    if (item.metadata.expiresAt && Date.now() > item.metadata.expiresAt) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      this.updateSize();
      return null;
    }

    this.cacheStats.hits++;
    return item.value;
  }

  public async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const now = Date.now();
    const metadata: CacheMetadata = {
      createdAt: now,
      ...(ttlMs && { ttl: ttlMs }),
      ...(ttlMs && { expiresAt: now + ttlMs }),
    };

    this.cache.set(key, { key, value, metadata });
    this.updateSize();
  }

  public async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateSize();
    }
    return deleted;
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    this.updateSize();
  }

  public async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  public async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  public async stats(): Promise<CacheStats> {
    return { ...this.cacheStats };
  }

  private updateSize(): void {
    this.cacheStats.size = this.cache.size;
  }

  // Cleanup expired items
  public cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.metadata.expiresAt && now > item.metadata.expiresAt) {
        this.cache.delete(key);
      }
    }
    this.updateSize();
  }
}

/**
 * Valkey/Redis cache implementation (placeholder for future implementation)
 */
export class ValkeyCache<T = any> implements Cache<T> {
  public constructor(private connection: any) {
    // TODO: Implement Valkey connection
  }

  public async get(_key: string): Promise<T | null> {
    // TODO: Implement Valkey get
    throw new Error('ValkeyCache not yet implemented');
  }

  public async set(_key: string, _value: T, _ttlMs?: number): Promise<void> {
    // TODO: Implement Valkey set
    throw new Error('ValkeyCache not yet implemented');
  }

  public async delete(_key: string): Promise<boolean> {
    // TODO: Implement Valkey delete
    throw new Error('ValkeyCache not yet implemented');
  }

  public async clear(): Promise<void> {
    // TODO: Implement Valkey clear
    throw new Error('ValkeyCache not yet implemented');
  }

  public async has(_key: string): Promise<boolean> {
    // TODO: Implement Valkey has
    throw new Error('ValkeyCache not yet implemented');
  }

  public async keys(_pattern?: string): Promise<string[]> {
    // TODO: Implement Valkey keys
    throw new Error('ValkeyCache not yet implemented');
  }

  public async stats(): Promise<CacheStats> {
    // TODO: Implement Valkey stats
    throw new Error('ValkeyCache not yet implemented');
  }
}
