import { useState, useEffect, useCallback } from 'react';

/**
 * Cache storage with configurable TTL
 */
class CacheStorage {
  constructor() {
    this.storage = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    const item = this.storage.get(key);
    if (!item) return undefined;

    // Check if expired
    if (item.expiry && item.expiry < Date.now()) {
      this.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = ttl ? Date.now() + ttl : null;
    this.storage.set(key, { value, expiry });
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.storage.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.storage.clear();
  }

  /**
   * Clear expired items from cache
   */
  cleanUp() {
    const now = Date.now();
    for (const [key, item] of this.storage.entries()) {
      if (item.expiry && item.expiry < now) {
        this.storage.delete(key);
      }
    }
  }
}

// Create a singleton cache instance
const cache = new CacheStorage();

// Set up periodic cleanup
setInterval(() => {
  cache.cleanUp();
}, 60000); // Clean up every minute

/**
 * Hook for client-side caching
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not in cache
 * @param {Object} options - Cache options
 * @returns {Object} Data and loading state
 */
export const useCache = (key, fetchFn, options = {}) => {
  const {
    ttl = cache.defaultTTL,
    enabled = true,
    deps = [],
    staleTime = 0
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  /**
   * Fetch data from the API or cache
   */
  const fetchData = useCallback(async (force = false) => {
    if (!key || !fetchFn) return;

    // If disabled, just fetch
    if (!enabled) {
      try {
        setLoading(true);
        const result = await fetchFn();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Check if we can use cached data
    const now = Date.now();
    const cached = cache.get(key);
    const isStale = lastFetchTime > 0 && (now - lastFetchTime) > staleTime;

    // Return cached data if available and not forcing refresh
    if (cached && !force && !isStale) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // If we have cached data but it's stale, show it while fetching new data
    if (cached && isStale) {
      setData(cached);
    }

    // Fetch fresh data
    try {
      setLoading(true);
      const result = await fetchFn();
      setData(result);
      setLastFetchTime(Date.now());
      
      // Cache the result
      cache.set(key, result, ttl);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, enabled, lastFetchTime, staleTime, ttl]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  /**
   * Force refresh the data
   */
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  /**
   * Clear this cache entry
   */
  const clearCache = useCallback(() => {
    if (key) {
      cache.delete(key);
    }
  }, [key]);

  return { data, loading, error, refresh, clearCache };
};

export default useCache;