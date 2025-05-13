import { useState, useCallback, useEffect, useRef } from 'react';
import useApi from './use-api';
import useCache from './use-cache';

/**
 * Hook for data fetching with pagination, sorting, filtering, and caching
 * @param {string} endpoint - API endpoint to fetch data from
 * @param {Object} options - Query options
 * @returns {Object} Query state and handlers
 */
const useQuery = (endpoint, options = {}) => {
  const {
    initialParams = {},
    initialSort = { field: 'createdAt', direction: 'desc' },
    initialPage = 1,
    initialPageSize = 10,
    cacheKey = endpoint,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    enableCache = true
  } = options;

  // API hook
  const { get, loading: apiLoading, error: apiError } = useApi();
  
  // Query state
  const [params, setParams] = useState(initialParams);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(initialSort);
  const isFirstRender = useRef(true);
  
  // Construct the full cache key including all parameters
  const fullCacheKey = useCallback(() => {
    return `${cacheKey}:${JSON.stringify({
      params,
      page,
      pageSize,
      sort
    })}`;
  }, [cacheKey, params, page, pageSize, sort]);

  // Fetch function for the cache hook
  const fetchData = useCallback(async () => {
    const queryParams = {
      ...params,
      _page: page,
      _limit: pageSize,
      _sort: sort.field,
      _order: sort.direction
    };
    
    const response = await get(endpoint, queryParams);
    return response;
  }, [endpoint, get, params, page, pageSize, sort]);

  // Use the cache hook with the fetch function
  const {
    data,
    loading: cacheLoading,
    error: cacheError,
    refresh
  } = useCache(
    enableCache ? fullCacheKey() : null,
    fetchData,
    {
      ttl: cacheTTL,
      enabled: enableCache,
      deps: [params, page, pageSize, sort]
    }
  );

  // If cache is disabled, fetch directly
  useEffect(() => {
    if (!enableCache && !isFirstRender.current) {
      fetchData();
    }
    isFirstRender.current = false;
  }, [enableCache, fetchData]);

  // Loading state combines API and cache loading
  const loading = enableCache ? cacheLoading : apiLoading;
  
  // Error state combines API and cache errors
  const error = enableCache ? cacheError : apiError;

  // Handler for changing sort
  const handleSort = useCallback((field, direction) => {
    setSort({ field, direction });
    // Reset to first page when sorting changes
    setPage(1);
  }, []);

  // Handler for changing page
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Handler for changing page size
  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    // Reset to first page when page size changes
    setPage(1);
  }, []);

  // Handler for changing filters
  const handleFilterChange = useCallback((newParams) => {
    setParams(prev => ({
      ...prev,
      ...newParams
    }));
    // Reset to first page when filters change
    setPage(1);
  }, []);

  // Handler for resetting filters
  const handleResetFilters = useCallback(() => {
    setParams(initialParams);
    setPage(initialPage);
    setPageSize(initialPageSize);
    setSort(initialSort);
  }, [initialParams, initialPage, initialPageSize, initialSort]);

  return {
    // Data and status
    data,
    loading,
    error,
    
    // Current state
    params,
    page,
    pageSize,
    sort,
    
    // Handlers
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    handleResetFilters,
    
    // Refresh data
    refresh
  };
};

export default useQuery;