import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../+server';
import { prisma } from '$lib/server/prisma';
import { comparePasswords } from '$lib/server/auth';
import { logger } from '$lib/server/logger';

// Mock dependencies
vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock.jwt.token')
  }))
}));

vi.mock('$lib/server/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('$lib/server/auth', () => ({
  comparePasswords: vi.fn()
}));

vi.mock('$lib/server/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn()
  },
  logError: vi.fn()
}));

describe('POST /api/auth/login', () => {
  const mockRequest = (body: any) => ({
    json: () => Promise.resolve(body)
  });

  const mockCookies = {
    set: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a valid JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-signing-jwt-tokens-securely';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  it('should return 400 if email is missing', async () => {
    const response = await POST({
      request: mockRequest({ password: 'test123' }),
      cookies: mockCookies
    } as any);

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.message).toBe('Email and password are required');
    expect(logger.warn).toHaveBeenCalledWith('Login attempt with missing credentials', { email: undefined });
  });

  it('should return 400 if password is missing', async () => {
    const response = await POST({
      request: mockRequest({ email: 'test@example.com' }),
      cookies: mockCookies
    } as any);

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.message).toBe('Email and password are required');
    expect(logger.warn).toHaveBeenCalledWith('Login attempt with missing credentials', { email: 'test@example.com' });
  });

  it('should return 401 if user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'test123' }),
      cookies: mockCookies
    } as any);

    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid email or password');
    expect(logger.warn).toHaveBeenCalledWith('Login attempt with non-existent email', { email: 'test@example.com' });
  });

  it('should return 401 if password is incorrect', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(comparePasswords).mockResolvedValue(false);

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'wrong-password' }),
      cookies: mockCookies
    } as any);

    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid email or password');
    expect(logger.warn).toHaveBeenCalledWith('Login attempt with invalid password', { 
      email: 'test@example.com',
      userId: 'test-user-id'
    });
  });

  it('should return 200 and set cookie for successful login', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(comparePasswords).mockResolvedValue(true);

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'correct-password' }),
      cookies: mockCookies
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.userId).toBe('test-user-id');
    expect(mockCookies.set).toHaveBeenCalledWith(
      'token',
      expect.any(String),
      expect.objectContaining({
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        secure: false // Because NODE_ENV is 'test'
      })
    );
    expect(logger.info).toHaveBeenCalledWith('User logged in successfully', {
      email: 'test@example.com',
      userId: 'test-user-id'
    });
  });

  it('should return 500 if an error occurs', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'test123' }),
      cookies: mockCookies
    } as any);

    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.message).toBe('An error occurred during login');
  });
}); 