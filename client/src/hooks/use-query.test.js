import { renderHook, act } from '@testing-library/react-hooks';
import useQuery from './use-query';
import useApi from './use-api';
import useCache from './use-cache';

// Mock dependencies
jest.mock('./use-api', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('./use-cache', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('useQuery Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with default values', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Render the hook
    const { result } = renderHook(() => useQuery('/api/test-endpoint'));
    
    // Check default values
    expect(result.current.params).toEqual({});
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.sort).toEqual({ field: 'createdAt', direction: 'desc' });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  
  it('should use custom initial values when provided', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Custom options
    const options = {
      initialParams: { status: 'active' },
      initialSort: { field: 'name', direction: 'asc' },
      initialPage: 2,
      initialPageSize: 20
    };
    
    // Render the hook with custom options
    const { result } = renderHook(() => useQuery('/api/test-endpoint', options));
    
    // Check custom values were used
    expect(result.current.params).toEqual({ status: 'active' });
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.sort).toEqual({ field: 'name', direction: 'asc' });
  });
  
  it('should handle sort change correctly', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Render the hook
    const { result } = renderHook(() => useQuery('/api/test-endpoint'));
    
    // Initial sort should be the default
    expect(result.current.sort).toEqual({ field: 'createdAt', direction: 'desc' });
    
    // Change sort
    act(() => {
      result.current.handleSort('name', 'asc');
    });
    
    // Check that sort was updated
    expect(result.current.sort).toEqual({ field: 'name', direction: 'asc' });
    
    // Page should be reset to 1 when sorting changes
    expect(result.current.page).toBe(1);
  });
  
  it('should handle page change correctly', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Render the hook
    const { result } = renderHook(() => useQuery('/api/test-endpoint'));
    
    // Initial page should be 1
    expect(result.current.page).toBe(1);
    
    // Change page
    act(() => {
      result.current.handlePageChange(3);
    });
    
    // Check that page was updated
    expect(result.current.page).toBe(3);
  });
  
  it('should handle page size change correctly', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Render the hook
    const { result } = renderHook(() => useQuery('/api/test-endpoint'));
    
    // Initial page size should be 10
    expect(result.current.pageSize).toBe(10);
    
    // Change page size
    act(() => {
      result.current.handlePageSizeChange(25);
    });
    
    // Check that page size was updated
    expect(result.current.pageSize).toBe(25);
    
    // Page should be reset to 1 when page size changes
    expect(result.current.page).toBe(1);
  });
  
  it('should handle filter change correctly', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Render the hook
    const { result } = renderHook(() => useQuery('/api/test-endpoint'));
    
    // Initial params should be empty
    expect(result.current.params).toEqual({});
    
    // Change filters
    act(() => {
      result.current.handleFilterChange({ status: 'active', search: 'test' });
    });
    
    // Check that params were updated
    expect(result.current.params).toEqual({ status: 'active', search: 'test' });
    
    // Page should be reset to 1 when filters change
    expect(result.current.page).toBe(1);
  });
  
  it('should handle filter reset correctly', () => {
    // Mock API hook
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock Cache hook
    useCache.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    
    // Initial options
    const options = {
      initialParams: { status: 'all' },
      initialSort: { field: 'name', direction: 'asc' },
      initialPage: 1,
      initialPageSize: 10
    };
    
    // Render the hook
    const { result } = renderHook(() => useQuery('/api/test-endpoint', options));
    
    // Change filters, sort, page, and page size
    act(() => {
      result.current.handleFilterChange({ status: 'active', search: 'test' });
      result.current.handleSort('date', 'desc');
      result.current.handlePageChange(3);
      result.current.handlePageSizeChange(25);
    });
    
    // Verify changes
    expect(result.current.params).toEqual({ status: 'active', search: 'test' });
    expect(result.current.sort).toEqual({ field: 'date', direction: 'desc' });
    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(25);
    
    // Reset all filters
    act(() => {
      result.current.handleResetFilters();
    });
    
    // Check that everything was reset to initial values
    expect(result.current.params).toEqual({ status: 'all' });
    expect(result.current.sort).toEqual({ field: 'name', direction: 'asc' });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });
  
  it('should provide the correct query parameters to the fetch function', () => {
    // Mock API hook and track function calls
    const mockGet = jest.fn();
    useApi.mockReturnValue({
      get: mockGet,
      loading: false,
      error: null
    });
    
    // Mock fetchData function to capture arguments
    let capturedEndpoint = null;
    let capturedParams = null;
    
    // Mock fetchData function for useCache
    const mockFetchData = jest.fn().mockImplementation(async () => {
      // This simulates what the fetchData function in useQuery does
      const queryParams = {
        ...result.current.params,
        _page: result.current.page,
        _limit: result.current.pageSize,
        _sort: result.current.sort.field,
        _order: result.current.sort.direction
      };
      
      capturedEndpoint = '/api/test-endpoint';
      capturedParams = queryParams;
      
      return { data: [], pagination: {} };
    });
    
    // Mock Cache hook to call our mock fetchData
    useCache.mockImplementation((key, fetchFn, options) => {
      // Call fetchFn immediately to capture parameters
      fetchFn();
      
      return {
        data: { data: [], pagination: {} },
        loading: false,
        error: null,
        refresh: jest.fn()
      };
    });
    
    // Render the hook with custom values
    const { result } = renderHook(() => useQuery('/api/test-endpoint', {
      initialParams: { status: 'active' },
      initialSort: { field: 'name', direction: 'asc' },
      initialPage: 2,
      initialPageSize: 20
    }));
    
    // Fetch function should have been called
    expect(capturedEndpoint).toBe('/api/test-endpoint');
    expect(capturedParams).toEqual({
      status: 'active',
      _page: 2,
      _limit: 20,
      _sort: 'name',
      _order: 'asc'
    });
  });
});