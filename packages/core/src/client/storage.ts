/**
 * Client-side storage for caching data
 */
export class ClientStorage {
  private cache = new Map<string, any>();
  private readonly storageKey = 'kossabos-client-cache';

  public constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Get value from cache
   */
  public get(key: string): any {
    return this.cache.get(key) || null;
  }

  /**
   * Set value in cache
   */
  public set(key: string, value: any): void {
    this.cache.set(key, value);
    this.saveToLocalStorage();
  }

  /**
   * Remove value from cache
   */
  public remove(key: string): void {
    this.cache.delete(key);
    this.saveToLocalStorage();
  }

  /**
   * Clear all cached data
   */
  public clear(): void {
    this.cache.clear();
    this.saveToLocalStorage();
  }

  /**
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all cached keys
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Load cache from localStorage if available
   */
  private loadFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Save cache to localStorage if available
   */
  private saveToLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }
}
