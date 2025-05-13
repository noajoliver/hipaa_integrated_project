/**
 * Unit tests for Security Middleware
 */
const {
  contentSecurityPolicy,
  strictTransportSecurity,
  permissionsPolicy,
  securityHeaders,
  clearSiteData,
  enhancedSecurity
} = require('../../middleware/security');

describe('Security Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      path: '/api/users'
    };
    
    res = {
      setHeader: jest.fn(),
      locals: {}
    };
    
    next = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('contentSecurityPolicy', () => {
    it('should set CSP header with defaults', () => {
      contentSecurityPolicy()(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
      
      expect(res.locals.cspNonce).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
    
    it('should set report-only CSP header if specified', () => {
      contentSecurityPolicy({ reportOnly: true })(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy-Report-Only',
        expect.any(String)
      );
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should merge custom directives with defaults', () => {
      contentSecurityPolicy({
        directives: {
          scriptSrc: ["'self'", "https://example.com"],
          connectSrc: ["'self'", "https://api.example.com"]
        }
      })(req, res, next);
      
      const cspHeader = res.setHeader.mock.calls[0][1];
      
      expect(cspHeader).toContain("script-src 'self' 'nonce-");
      expect(cspHeader).toContain("https://example.com");
      expect(cspHeader).toContain("connect-src 'self' https://api.example.com");
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('strictTransportSecurity', () => {
    it('should set HSTS header with defaults', () => {
      strictTransportSecurity()(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringMatching(/^max-age=\d+$/)
      );
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should include subdomains and preload when specified', () => {
      strictTransportSecurity({
        includeSubDomains: true,
        preload: true,
        maxAge: '2y'
      })(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringMatching(/^max-age=\d+; includeSubDomains; preload$/)
      );
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('permissionsPolicy', () => {
    it('should set Permissions-Policy header with defaults', () => {
      permissionsPolicy()(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('camera=()')
      );
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should allow customizing features', () => {
      permissionsPolicy({
        features: {
          camera: ["'self'"],
          microphone: ["'self'"],
          geolocation: []
        }
      })(req, res, next);
      
      const policyHeader = res.setHeader.mock.calls[0][1];
      
      expect(policyHeader).toContain("camera=('self')");
      expect(policyHeader).toContain("microphone=('self')");
      expect(policyHeader).toContain("geolocation=()");
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('securityHeaders', () => {
    it('should set various security headers', () => {
      securityHeaders()(req, res, next);
      
      // Check X-Content-Type-Options
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      
      // Check Referrer-Policy
      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      
      // Check X-XSS-Protection
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
      
      // Check X-Frame-Options
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should set cache control for sensitive paths', () => {
      req.path = '/api/auth/login';
      
      securityHeaders()(req, res, next);
      
      // Check Cache-Control
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      
      // Check Pragma
      expect(res.setHeader).toHaveBeenCalledWith(
        'Pragma',
        'no-cache'
      );
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('clearSiteData', () => {
    it('should set Clear-Site-Data header', () => {
      clearSiteData()(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Clear-Site-Data',
        '"cache", "cookies", "storage", "executionContexts"'
      );
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('enhancedSecurity', () => {
    it('should apply all security middlewares in production', () => {
      // Mock process.env.NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      enhancedSecurity()(req, res, next);
      
      // Check CSP was applied
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String)
      );
      
      // Check HSTS was applied
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
      
      // Check Permissions-Policy was applied
      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.any(String)
      );
      
      // Check security headers were applied
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      
      expect(next).toHaveBeenCalled();
      
      // Restore process.env.NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    it('should skip HSTS in development', () => {
      // Mock process.env.NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      enhancedSecurity()(req, res, next);
      
      // Check CSP was applied
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String)
      );
      
      // Check HSTS was NOT applied
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
      
      // Check Permissions-Policy was applied
      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.any(String)
      );
      
      expect(next).toHaveBeenCalled();
      
      // Restore process.env.NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    it('should allow customizing security options', () => {
      // Mock process.env.NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      enhancedSecurity({
        cspDirectives: {
          connectSrc: ["'self'", "https://api.example.com"]
        },
        hstsMaxAge: '2y',
        hstsIncludeSubDomains: true,
        hstsPreload: true,
        permissionsPolicyFeatures: {
          camera: ["'self'"]
        }
      })(req, res, next);
      
      // Check for custom CSP connect-src
      const headerCalls = res.setHeader.mock.calls;
      const cspHeader = headerCalls.find(call => call[0] === 'Content-Security-Policy')[1];
      
      expect(cspHeader).toContain("connect-src 'self' https://api.example.com");
      
      // Restore process.env.NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});