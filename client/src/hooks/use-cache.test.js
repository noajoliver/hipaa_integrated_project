import { renderHook, act } from '@testing-library/react-hooks';
import useCache from './use-cache';

// Mock timers
jest.useFakeTimers();

describe('useCache Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should fetch and cache data on initial render', async () => {
    // Mock fetch function
    const mockFetchFn = jest.fn().mockResolvedValue({ data: 'test-data' });
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useCache('test-key', mockFetchFn, { ttl: 5000 })
    );
    
    // Initially loading should be true
    expect(result.current.loading).toBe(true);
    
    // Wait for the fetch to complete
    await waitForNextUpdate();
    
    // Check that the data was fetched and loading is false
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ data: 'test-data' });
    expect(result.current.loading).toBe(false);
  });
  
  it('should return cached data without fetching again', async () => {
    // Mock fetch function
    const mockFetchFn = jest.fn().mockResolvedValue({ data: 'test-data' });
    
    // First render to populate cache
    const { waitForNextUpdate } = renderHook(() => 
      useCache('cache-key', mockFetchFn, { ttl: 5000 })
    );
    
    // Wait for the fetch to complete
    await waitForNextUpdate();
    
    // Reset mock to verify it's not called again
    mockFetchFn.mockClear();
    
    // Render again with same key
    const { result } = renderHook(() => 
      useCache('cache-key', mockFetchFn, { ttl: 5000 })
    );
    
    // Data should be available immediately, no loading state
    expect(result.current.data).toEqual({ data: 'test-data' });
    expect(result.current.loading).toBe(false);
    expect(mockFetchFn).not.toHaveBeenCalled();
  });
  
  it('should fetch new data when refresh is called', async () => {
    // Mock fetch function
    const mockFetchFn = jest.fn()
      .mockResolvedValueOnce({ data: 'initial-data' })
      .mockResolvedValueOnce({ data: 'refreshed-data' });
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useCache('refresh-key', mockFetchFn, { ttl: 5000 })
    );
    
    // Wait for the initial fetch to complete
    await waitForNextUpdate();
    
    // Verify initial data
    expect(result.current.data).toEqual({ data: 'initial-data' });
    
    // Call refresh
    act(() => {
      result.current.refresh();
    });
    
    // Loading should be true during refresh
    expect(result.current.loading).toBe(true);
    
    // Wait for refresh to complete
    await waitForNextUpdate();
    
    // Verify data was refreshed
    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ data: 'refreshed-data' });
    expect(result.current.loading).toBe(false);
  });
  
  it('should handle fetch errors correctly', async () => {
    // Mock fetch function that throws an error
    const mockError = new Error('Fetch failed');
    const mockFetchFn = jest.fn().mockRejectedValue(mockError);
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useCache('error-key', mockFetchFn)
    );
    
    // Wait for the fetch to complete
    await waitForNextUpdate();
    
    // Verify error state
    expect(result.current.error).toBe(mockError);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
  
  it('should clear cached data when clearCache is called', async () => {
    // Mock fetch function
    const mockFetchFn = jest.fn()
      .mockResolvedValueOnce({ data: 'cached-data' })
      .mockResolvedValueOnce({ data: 'fresh-data' });
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useCache('clear-key', mockFetchFn)
    );
    
    // Wait for the initial fetch to complete
    await waitForNextUpdate();
    
    // Verify initial data
    expect(result.current.data).toEqual({ data: 'cached-data' });
    
    // Clear the cache and force a refresh
    act(() => {
      result.current.clearCache();
      result.current.refresh();
    });
    
    // Wait for new fetch to complete
    await waitForNextUpdate();
    
    // Verify fresh data was fetched
    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ data: 'fresh-data' });
  });
  
  it('should not cache when enabled is false', async () => {
    // Mock fetch function
    const mockFetchFn = jest.fn().mockResolvedValue({ data: 'uncached-data' });
    
    // Render the hook with caching disabled
    const { result, waitForNextUpdate } = renderHook(() => 
      useCache('disabled-key', mockFetchFn, { enabled: false })
    );
    
    // Wait for the fetch to complete
    await waitForNextUpdate();
    
    // Data should be fetched
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ data: 'uncached-data' });
    
    // Reset mock
    mockFetchFn.mockClear();
    
    // Render again with same key but caching disabled
    const { result: result2, waitForNextUpdate: wait2 } = renderHook(() => 
      useCache('disabled-key', mockFetchFn, { enabled: false })
    );
    
    // Wait for the fetch to complete
    await wait2();
    
    // Data should be fetched again since caching is disabled
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(result2.current.data).toEqual({ data: 'uncached-data' });
  });
  
  it('should fetch new data when dependencies change', async () => {
    // Mock fetch function
    const mockFetchFn = jest.fn()
      .mockResolvedValueOnce({ data: 'data-1' })
      .mockResolvedValueOnce({ data: 'data-2' });
    
    // Track current dependency
    let dependency = 'dep1';
    
    // Render the hook with a dependency
    const { result, waitForNextUpdate, rerender } = renderHook(() => 
      useCache('dep-key', mockFetchFn, { deps: [dependency] })
    );
    
    // Wait for the initial fetch to complete
    await waitForNextUpdate();
    
    // Verify initial data
    expect(result.current.data).toEqual({ data: 'data-1' });
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    
    // Change dependency and rerender
    dependency = 'dep2';
    rerender();
    
    // Wait for the fetch to complete
    await waitForNextUpdate();
    
    // Verify data was fetched again due to dependency change
    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ data: 'data-2' });
  });
});