import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { prisma } from '$lib/server/prisma';
import type { HttpError } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    backtest: {
      findUnique: vi.fn()
    }
  }
}));

describe('GET /api/backtest/[id]', () => {
  const mockParams = {
    id: 'test-backtest-id'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    let error: HttpError | undefined;
    try {
      await GET({
        params: mockParams,
        locals: {}
      } as any);
    } catch (e) {
      error = e as HttpError;
    }
    expect(error).toBeDefined();
    expect(error?.status).toBe(401);
    expect(error?.body.message).toBe('Unauthorized');
  });

  it('should return 404 if backtest is not found', async () => {
    vi.mocked(prisma.backtest.findUnique).mockResolvedValue(null);

    let error: HttpError | undefined;
    try {
      await GET({
        params: mockParams,
        locals: { userId: 'test-user-id' }
      } as any);
    } catch (e) {
      error = e as HttpError;
    }
    expect(error).toBeDefined();
    expect(error?.status).toBe(404);
    expect(error?.body.message).toBe('Backtest not found');
  });

  it('should return 403 if user is not authorized to view backtest', async () => {
    const mockBacktest = {
      id: 'test-backtest-id',
      userId: 'other-user-id',
      strategyId: 'test-strategy-id',
      status: 'completed',
      results: '{"profit": 100}',
      startDate: new Date(),
      endDate: new Date(),
      pair: 'SOL/USDC',
      timeframe: '1h',
      config: '{"riskLevel": "medium"}',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    vi.mocked(prisma.backtest.findUnique).mockResolvedValue(mockBacktest);

    let error: HttpError | undefined;
    try {
      await GET({
        params: mockParams,
        locals: { userId: 'test-user-id' }
      } as any);
    } catch (e) {
      error = e as HttpError;
    }
    expect(error).toBeDefined();
    expect(error?.status).toBe(403);
    expect(error?.body.message).toBe('Not authorized to view this backtest');
  });

  it('should return backtest data for authorized user', async () => {
    const now = new Date();
    const mockBacktest = {
      id: 'test-backtest-id',
      userId: 'test-user-id',
      strategyId: 'test-strategy-id',
      status: 'completed',
      results: '{"profit": 100}',
      startDate: now,
      endDate: now,
      pair: 'SOL/USDC',
      timeframe: '1h',
      config: '{"riskLevel": "medium"}',
      createdAt: now,
      updatedAt: now
    };

    vi.mocked(prisma.backtest.findUnique).mockResolvedValue(mockBacktest);

    const response = await GET({
      params: mockParams,
      locals: { userId: 'test-user-id' }
    } as any);

    const data = await response.json();
    expect(data).toEqual({
      ...mockBacktest,
      startDate: mockBacktest.startDate.toISOString(),
      endDate: mockBacktest.endDate.toISOString(),
      createdAt: mockBacktest.createdAt.toISOString(),
      updatedAt: mockBacktest.updatedAt.toISOString()
    });
    expect(prisma.backtest.findUnique).toHaveBeenCalledWith({
      where: { id: mockParams.id }
    });
  });
}); 