/**
 * Lazy Loading Data Cache System
 * 
 * This module provides a caching layer that:
 * 1. Only loads data when explicitly requested
 * 2. Caches data per-endpoint with individual TTLs
 * 3. Automatically invalidates stale cache
 * 4. Prevents duplicate simultaneous requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5002/api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  loading: Promise<T> | null;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
}

// Cache configurations for different endpoints
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  'test-templates': { ttl: 60 * 60 * 1000, key: 'test_templates' }, // 1 hour
  'clients': { ttl: 5 * 60 * 1000, key: 'clients' }, // 5 minutes
  'referral-doctors': { ttl: 60 * 60 * 1000, key: 'referral_doctors' }, // 1 hour
  'branches': { ttl: 60 * 60 * 1000, key: 'branches' }, // 1 hour
  'antibiotics': { ttl: 60 * 60 * 1000, key: 'antibiotics' }, // 1 hour
  'units': { ttl: 60 * 60 * 1000, key: 'units' }, // 1 hour
  'visits': { ttl: 30 * 1000, key: 'visits' }, // 30 seconds
  'visit-tests': { ttl: 30 * 1000, key: 'visit_tests' }, // 30 seconds
  'users': { ttl: 5 * 60 * 1000, key: 'users' }, // 5 minutes
};

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Get data from cache or fetch from API
   */
  async get<T>(
    endpoint: string,
    forceRefresh: boolean = false
  ): Promise<T> {
    const config = CACHE_CONFIGS[endpoint];
    if (!config) {
      console.warn(`⚠️ No cache config for endpoint: ${endpoint}`);
      return this.fetchFromAPI<T>(endpoint);
    }

    const cacheKey = config.key;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Check if we have valid cached data
    if (!forceRefresh && cached && (now - cached.timestamp) < config.ttl) {
      const age = Math.floor((now - cached.timestamp) / 1000);
      console.log(`✅ Cache HIT: ${endpoint} (age: ${age}s)`);
      return cached.data;
    }

    // Check if there's already a pending request for this endpoint
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: ${endpoint}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Fetch from API
    console.log(`🔄 Cache MISS: ${endpoint} - fetching from API`);
    const promise = this.fetchFromAPI<T>(endpoint);
    
    // Store pending request to prevent duplicates
    this.pendingRequests.set(cacheKey, promise);

    try {
      const data = await promise;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: now,
        loading: null,
      });

      return data;
    } finally {
      // Remove pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch data from API
   */
  private async fetchFromAPI<T>(endpoint: string): Promise<T> {
    const authToken = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Invalidate cache for specific endpoint
   */
  invalidate(endpoint: string): void {
    const config = CACHE_CONFIGS[endpoint];
    if (config) {
      this.cache.delete(config.key);
      console.log(`🗑️ Cache invalidated: ${endpoint}`);
    }
  }

  /**
   * Invalidate multiple related caches at once
   */
  invalidateMultiple(endpoints: string[]): void {
    endpoints.forEach(endpoint => this.invalidate(endpoint));
    console.log(`🗑️ Invalidated ${endpoints.length} caches`);
  }

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log(`🗑️ All caches cleared`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { endpoint: string; age: number; size: number }[] {
    const now = Date.now();
    const stats: { endpoint: string; age: number; size: number }[] = [];

    this.cache.forEach((entry, key) => {
      const age = Math.floor((now - entry.timestamp) / 1000);
      const size = JSON.stringify(entry.data).length;
      stats.push({ endpoint: key, age, size });
    });

    return stats;
  }

  /**
   * Preload multiple endpoints in parallel
   */
  async preload(endpoints: string[]): Promise<void> {
    console.log(`📦 Preloading ${endpoints.length} endpoints...`);
    await Promise.all(endpoints.map(endpoint => this.get(endpoint)));
    console.log(`✅ Preload complete`);
  }
}

// Singleton instance
export const dataCache = new DataCache();

/**
 * Hook-like function to get data with caching
 */
export async function getCachedData<T>(
  endpoint: string,
  forceRefresh: boolean = false
): Promise<T> {
  return dataCache.get<T>(endpoint, forceRefresh);
}

/**
 * Invalidate cache for specific endpoint
 */
export function invalidateCache(endpoint: string): void {
  dataCache.invalidate(endpoint);
}

/**
 * Invalidate multiple caches at once
 */
export function invalidateMultipleCaches(endpoints: string[]): void {
  dataCache.invalidateMultiple(endpoints);
}

/**
 * Invalidate all caches
 */
export function invalidateAllCaches(): void {
  dataCache.invalidateAll();
}

/**
 * Invalidate all cache
 */
export function invalidateAllCache(): void {
  dataCache.invalidateAll();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return dataCache.getStats();
}

/**
 * Preload data for specific view
 */
export async function preloadViewData(view: string): Promise<void> {
  const viewDataMap: Record<string, string[]> = {
    'reception': ['test-templates', 'clients', 'referral-doctors', 'branches'],
    'phlebotomy': ['visits', 'visit-tests'],
    'lab': ['visits', 'visit-tests', 'antibiotics', 'units'],
    'approver': ['visits', 'visit-tests', 'users'],
    'admin': ['users', 'test-templates', 'clients', 'branches', 'antibiotics', 'units'],
    'b2b-dashboard': ['clients', 'visits'],
  };

  const endpoints = viewDataMap[view] || [];
  if (endpoints.length > 0) {
    await dataCache.preload(endpoints);
  }
}

