import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../+server';
import { prisma } from '$lib/server/prisma';
import { hashPassword } from '$lib/server/auth';
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
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock('$lib/server/auth', () => ({
  hashPassword: vi.fn().mockReturnValue('hashed-password')
}));

vi.mock('$lib/server/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn()
  },
  logError: vi.fn()
}));

describe('POST /api/auth/register', () => {
  const mockRequest = (body: any) => ({
    json: () => Promise.resolve(body)
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-signing-jwt-tokens-securely';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should return 400 if email is missing', async () => {
    const response = await POST({
      request: mockRequest({ password: 'test123' })
    } as any);

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.message).toBe('Email and password are required');
    expect(logger.warn).toHaveBeenCalledWith('Registration attempt with missing data', { email: undefined });
  });

  it('should return 400 if password is missing', async () => {
    const response = await POST({
      request: mockRequest({ email: 'test@example.com' })
    } as any);

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.message).toBe('Email and password are required');
    expect(logger.warn).toHaveBeenCalledWith('Registration attempt with missing data', { email: 'test@example.com' });
  });

  it('should return 400 if email already exists', async () => {
    const existingUser = {
      id: 'existing-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'test123' })
    } as any);

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.message).toBe('Email already registered');
    expect(logger.warn).toHaveBeenCalledWith('Registration attempt with existing email', { email: 'test@example.com' });
  });

  it('should create user and return token for valid registration', async () => {
    const newUser = {
      id: 'new-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(newUser);

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'test123' })
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.token).toBe('mock.jwt.token');
    expect(response.headers.get('Set-Cookie')).toContain('token=mock.jwt.token');
    expect(response.headers.get('Set-Cookie')).toContain('Path=/');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=86400');

    expect(hashPassword).toHaveBeenCalledWith('test123');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: 'hashed-password'
      }
    });
    expect(logger.info).toHaveBeenCalledWith('New user registered', {
      email: 'test@example.com',
      userId: 'new-user-id'
    });
  });

  it('should return 500 if an error occurs', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

    const response = await POST({
      request: mockRequest({ email: 'test@example.com', password: 'test123' })
    } as any);

    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.message).toBe('An error occurred during registration');
  });
}); 