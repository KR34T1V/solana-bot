import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { birdeyeService } from '$lib/services';

vi.mock('$lib/services', () => ({
    birdeyeService: {
        searchTokens: vi.fn()
    }
}));

describe('Search API Endpoint', () => {
    const TEST_USER_ID = 'test-user-123';
    const TEST_QUERY = 'SOL';
    const TEST_TOKENS = [
        {
            address: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Wrapped SOL',
            logoURI: 'https://example.com/sol.png',
            decimals: 9
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return tokens when search is successful', async () => {
        vi.mocked(birdeyeService.searchTokens).mockResolvedValue(TEST_TOKENS);

        const response = await GET({
            url: new URL(`http://localhost/api/data/search?query=${TEST_QUERY}`),
            locals: { userId: TEST_USER_ID }
        } as any);

        const data = await response.json();
        
        expect(data).toEqual({
            success: true,
            tokens: TEST_TOKENS
        });
        expect(birdeyeService.searchTokens).toHaveBeenCalledWith(TEST_QUERY, TEST_USER_ID);
    });

    it('should return 401 when user is not authenticated', async () => {
        const response = await GET({
            url: new URL(`http://localhost/api/data/search?query=${TEST_QUERY}`),
            locals: {}
        } as any);

        expect(response.status).toBe(401);
    });

    it('should return 400 when query is missing', async () => {
        const response = await GET({
            url: new URL('http://localhost/api/data/search'),
            locals: { userId: TEST_USER_ID }
        } as any);

        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data).toEqual({
            success: false,
            error: { message: 'Search query is required' }
        });
    });

    it('should return 403 when API key is missing', async () => {
        vi.mocked(birdeyeService.searchTokens).mockRejectedValue(
            new Error('No Birdeye API key found. Please add your API key in settings.')
        );

        const response = await GET({
            url: new URL(`http://localhost/api/data/search?query=${TEST_QUERY}`),
            locals: { userId: TEST_USER_ID }
        } as any);

        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data).toEqual({
            success: false,
            error: { message: 'No Birdeye API key found. Please add your API key in settings.' }
        });
    });

    it('should return 500 on unexpected errors', async () => {
        vi.mocked(birdeyeService.searchTokens).mockRejectedValue(new Error('Unexpected error'));

        const response = await GET({
            url: new URL(`http://localhost/api/data/search?query=${TEST_QUERY}`),
            locals: { userId: TEST_USER_ID }
        } as any);

        const data = await response.json();
        
        expect(response.status).toBe(500);
        expect(data).toEqual({
            success: false,
            error: { message: 'Unexpected error' }
        });
    });
}); 