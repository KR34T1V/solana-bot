import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { BirdeyeService } from '$lib/services/birdeye.service';
import type { RequestEvent } from '@sveltejs/kit';

// Mock Cookies interface
const mockCookies = {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    serialize: vi.fn()
};

// Mock BirdeyeService
const mockGetOHLCVData = vi.fn();
vi.mock('$lib/services/birdeye.service', () => ({
    BirdeyeService: vi.fn().mockImplementation(() => ({
        getOHLCVData: mockGetOHLCVData
    }))
}));

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
    prisma: {
        apiKey: {
            findFirst: vi.fn()
        }
    }
}));

describe('Historical Data Endpoint', () => {
    const createMockRequestEvent = (body: any, userId: string | null): Partial<RequestEvent> => ({
        request: new Request('http://localhost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }),
        locals: { userId },
        cookies: mockCookies,
        fetch: vi.fn(),
        getClientAddress: () => '127.0.0.1',
        params: {},
        platform: {},
        route: { id: null },
        setHeaders: vi.fn(),
        url: new URL('http://localhost'),
        isDataRequest: false,
        isSubRequest: false
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw 401 if user is not authenticated', async () => {
        const event = createMockRequestEvent({}, null);
        try {
            await POST(event as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (err: any) {
            expect(err.status).toBe(401);
            expect(err.body?.message).toBe('Unauthorized');
        }
    });

    it('should throw 400 if required parameters are missing', async () => {
        const event = createMockRequestEvent({}, 'user-1');
        try {
            await POST(event as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (err: any) {
            expect(err.status).toBe(400);
            expect(err.body?.message).toBe('Missing required parameters');
        }
    });

    it('should throw 400 if timeframe is invalid', async () => {
        const event = createMockRequestEvent({
            address: 'test-address',
            timeframe: 'invalid'
        }, 'user-1');
        try {
            await POST(event as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (err: any) {
            expect(err.status).toBe(400);
            expect(err.body?.message).toBe('Invalid timeframe');
        }
    });

    it('should throw 400 if no active API key is found', async () => {
        prisma.apiKey.findFirst.mockResolvedValueOnce(null);

        const event = createMockRequestEvent({
            address: 'test-address',
            timeframe: '1h'
        }, 'user-1');

        try {
            await POST(event as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (err: any) {
            expect(err.status).toBe(400);
            expect(err.body?.message).toBe('No active Birdeye API key found');
        }
    });

    it('should return OHLCV data successfully', async () => {
        const mockApiKey = { key: 'test-key' };
        const mockOHLCVData = {
            success: true,
            data: {
                items: [{
                    unixTime: Date.now(),
                    open: 1.0,
                    high: 1.5,
                    low: 0.9,
                    close: 1.2,
                    volume: 1000
                }]
            }
        };

        prisma.apiKey.findFirst.mockResolvedValueOnce(mockApiKey);
        mockGetOHLCVData.mockResolvedValueOnce(mockOHLCVData);

        const event = createMockRequestEvent({
            address: 'test-address',
            timeframe: '1h'
        }, 'user-1');

        const response = await POST(event as RequestEvent);
        const data = await response.json();

        expect(data).toEqual(mockOHLCVData);
        expect(mockGetOHLCVData).toHaveBeenCalledWith('test-address', '1h', 'test-key');
    });

    it('should handle BirdeyeService errors', async () => {
        const mockApiKey = { key: 'test-key' };
        prisma.apiKey.findFirst.mockResolvedValueOnce(mockApiKey);
        mockGetOHLCVData.mockRejectedValueOnce(new Error('API Error'));

        const event = createMockRequestEvent({
            address: 'test-address',
            timeframe: '1h'
        }, 'user-1');

        try {
            await POST(event as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (err: any) {
            expect(err.status).toBe(500);
            expect(err.body?.message).toBe('Failed to fetch historical data');
        }
    });
}); 