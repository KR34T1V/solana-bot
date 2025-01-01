import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry } from '../fetch';

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn()
    }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchWithRetry', () => {
    beforeEach(() => {
        mockFetch.mockClear();
        vi.clearAllMocks();
    });

    it('should successfully fetch on first attempt', async () => {
        const mockResponse = { data: 'test' };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const response = await fetchWithRetry('https://api.test.com/data');
        expect(response.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should build URL with query parameters', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({})
        });

        await fetchWithRetry('https://api.test.com/data', {
            params: {
                key1: 'value1',
                key2: 'value2'
            }
        });

        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.test.com/data?key1=value1&key2=value2',
            expect.any(Object)
        );
    });

    it('should retry on network error', async () => {
        const networkError = new TypeError('Failed to fetch');
        const mockResponse = { data: 'test' };

        mockFetch
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

        const response = await fetchWithRetry('https://api.test.com/data');
        expect(response.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit with retry-after header', async () => {
        const mockResponse = { data: 'test' };
        const rateLimitResponse = {
            ok: false,
            status: 429,
            headers: new Headers({
                'retry-after': '1'
            })
        };

        mockFetch
            .mockResolvedValueOnce(rateLimitResponse)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

        const response = await fetchWithRetry('https://api.test.com/data');
        expect(response.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on server errors', async () => {
        const mockResponse = { data: 'test' };
        const serverError = {
            ok: false,
            status: 500
        };

        mockFetch
            .mockResolvedValueOnce(serverError)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

        const response = await fetchWithRetry('https://api.test.com/data');
        expect(response.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect max retry attempts', async () => {
        const serverError = {
            ok: false,
            status: 500
        };

        mockFetch
            .mockResolvedValueOnce(serverError)
            .mockResolvedValueOnce(serverError)
            .mockResolvedValueOnce(serverError);

        await expect(fetchWithRetry('https://api.test.com/data')).rejects.toThrow();
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use custom retry configuration', async () => {
        const serverError = {
            ok: false,
            status: 500
        };

        mockFetch
            .mockResolvedValueOnce(serverError)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: 'test' })
            });

        const response = await fetchWithRetry('https://api.test.com/data', {}, {
            maxAttempts: 2,
            initialDelayMs: 100,
            maxDelayMs: 1000,
            backoffFactor: 2
        });

        expect(response.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors (4xx except 408/429)', async () => {
        const clientError = {
            ok: false,
            status: 400
        };

        mockFetch.mockResolvedValueOnce(clientError);

        await expect(fetchWithRetry('https://api.test.com/data')).rejects.toThrow();
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle non-standard errors', async () => {
        mockFetch.mockRejectedValueOnce('Unknown error');

        await expect(fetchWithRetry('https://api.test.com/data')).rejects.toThrow();
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should pass through request options', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({})
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer token'
            },
            body: JSON.stringify({ test: true })
        };

        await fetchWithRetry('https://api.test.com/data', options);

        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.test.com/data',
            expect.objectContaining(options)
        );
    });

    it('should handle empty retry-after header', async () => {
        const rateLimitResponse = {
            ok: false,
            status: 429,
            headers: new Headers()
        };

        mockFetch
            .mockResolvedValueOnce(rateLimitResponse)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

        const response = await fetchWithRetry('https://api.test.com/data');
        expect(response.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
}); 