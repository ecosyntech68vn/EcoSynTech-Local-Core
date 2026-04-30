/**
 * Unit Tests - Auth Middleware
 * Test JWT authentication, token validation, refresh token
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock config before requiring auth
jest.mock('../src/config', () => ({
  jwt: { secret: 'test-secret-key-for-development-use-only' },
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}));

jest.mock('../src/config/database', () => ({
  getOne: jest.fn(),
  getAll: jest.fn(),
  db: { run: jest.fn() }
}));

const { auth, generateAccessToken, verifyToken, recordFailedLogin, checkAccountLocked } = require('../src/middleware/auth');

describe('Auth Middleware - JWT Functions', () => {
  let req, res, next;
  const JWT_SECRET = 'test-secret-key-for-development-use-only';

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('generateAccessToken', () => {
    it('should generate valid JWT token', () => {
      const user = { id: 'user_001', email: 'test@example.com', role: 'admin' };
      const token = generateAccessToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.sub).toBe('user_001');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateAccessToken({ id: 'user_1', role: 'admin' });
      const token2 = generateAccessToken({ id: 'user_2', role: 'admin' });
      
      expect(token1).not.toBe(token2);
    });

    it('should include iat and exp in token', () => {
      const token = generateAccessToken({ id: 'user_001', role: 'admin' });
      const decoded = jwt.decode(token);
      
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      const token = jwt.sign({ sub: 'user_001', email: 'test@example.com', role: 'admin' }, JWT_SECRET);
      const result = verifyToken(token);
      
      expect(result).not.toBeNull();
      expect(result.sub).toBe('user_001');
      expect(result.email).toBe('test@example.com');
    });

    it('should return null for expired token', () => {
      const token = jwt.sign({ sub: 'user_001' }, JWT_SECRET, { expiresIn: '-1s' });
      const result = verifyToken(token);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token-string');
      
      expect(result).toBeNull();
    });

    it('should return null for token with wrong signature', () => {
      const token = jwt.sign({ sub: 'user_001' }, 'wrong-secret');
      const result = verifyToken(token);
      
      expect(result).toBeNull();
    });
  });

  describe('Account Lockout Functions', () => {
    beforeEach(() => {
      // Reset failed login attempts
      recordFailedLogin('test-user-reset');
    });

    it('recordFailedLogin should track failed attempts', () => {
      const attemptCount = recordFailedLogin('test-user-1');
      expect(attemptCount).toBe(1);
    });

    it('checkAccountLocked should return false for new user', () => {
      const isLocked = checkAccountLocked('new-user-never-locked');
      expect(isLocked).toBe(false);
    });
  });

  describe('auth middleware', () => {
    it('should reject request without Authorization header', () => {
      auth(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      req.headers['authorization'] = 'InvalidFormat';
      
      auth(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      
      auth(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow request with valid token', () => {
      const user = { id: 'user_001', email: 'test@example.com', role: 'admin' };
      const validToken = generateAccessToken(user);
      req.headers['authorization'] = `Bearer ${validToken}`;
      
      auth(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.sub).toBe('user_001');
    });

    it('should extract user info from valid token', () => {
      const user = { 
        id: 'user_123', 
        email: 'admin@example.com', 
        role: 'manager',
        farm_id: 'farm_001'
      };
      const validToken = generateAccessToken(user);
      req.headers['authorization'] = `Bearer ${validToken}`;
      
      auth(req, res, next);
      
      expect(req.user).toMatchObject({
        sub: 'user_123',
        email: 'admin@example.com',
        role: 'manager'
      });
    });
  });
});

describe('Auth Middleware - Exports', () => {
  it('should export auth function', () => {
    expect(typeof auth).toBe('function');
  });

  it('should export generateAccessToken function', () => {
    expect(typeof generateAccessToken).toBe('function');
  });

  it('should export verifyToken function', () => {
    expect(typeof verifyToken).toBe('function');
  });
});