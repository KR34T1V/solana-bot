import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { logger } from '$lib/server/logger';

// Mock dependencies
vi.mock('$lib/server/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('POST /api/auth/logout', () => {
  const mockCookies = {
    delete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear token cookie and return success', async () => {
    const response = await POST({
      cookies: mockCookies,
      locals: {}
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCookies.delete).toHaveBeenCalledWith('token', { path: '/' });
  });

  it('should log logout event if userId is present', async () => {
    const response = await POST({
      cookies: mockCookies,
      locals: { userId: 'test-user-id' }
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCookies.delete).toHaveBeenCalledWith('token', { path: '/' });
    expect(logger.info).toHaveBeenCalledWith('User logged out', { userId: 'test-user-id' });
  });

  it('should return 500 if an error occurs', async () => {
    mockCookies.delete.mockImplementationOnce(() => {
      throw new Error('Cookie error');
    });

    const response = await POST({
      cookies: mockCookies,
      locals: {}
    } as any);

    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.message).toBe('An error occurred during logout');
    expect(logger.error).toHaveBeenCalledWith('Error during logout', { error: expect.any(Error) });
  });
}); 