import { vi } from 'vitest';

// Mock fetch implementation that will be used in the tests
export const mockFetch = vi.fn().mockImplementation(async (url: string, options: any = {}) => {
    // By default, return a successful response
    return new MockResponse({}, { status: 200 });
});

// Mock the global fetch function
global.fetch = mockFetch;

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn()
    }
}));

// Create a mock Response class that implements the Response interface
class MockResponse implements Response {
    ok: boolean;
    status: number;
    statusText: string;
    headers: Headers;
    redirected: boolean;
    type: ResponseType;
    url: string;
    body: ReadableStream<Uint8Array> | null;
    bodyUsed: boolean;
    private responseData: any;

    constructor(data: any, init: ResponseInit = {}) {
        this.status = init.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = init.statusText || '';
        this.headers = new Headers(init.headers);
        this.redirected = false;
        this.type = 'default';
        this.url = '';
        this.body = null;
        this.bodyUsed = false;
        this.responseData = data;
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error('Method not implemented.');
    }

    async blob(): Promise<Blob> {
        throw new Error('Method not implemented.');
    }

    async formData(): Promise<FormData> {
        throw new Error('Method not implemented.');
    }

    async json(): Promise<any> {
        if (!this.ok) {
            throw new Error(this.statusText);
        }
        return Promise.resolve(this.responseData);
    }

    async text(): Promise<string> {
        if (!this.ok) {
            throw new Error(this.statusText);
        }
        return Promise.resolve(JSON.stringify(this.responseData));
    }

    clone(): Response {
        return new MockResponse(this.responseData, {
            status: this.status,
            statusText: this.statusText,
            headers: this.headers
        });
    }
}

// Helper to create mock responses
export const createMockResponse = (data: any, init: ResponseInit = {}): MockResponse => {
    return new MockResponse(data, init);
};

// Provider-specific mock responses
export const mockProviderResponses = {
    auth: {
        success: { success: true },
        error: { success: false, error: 'Invalid API key' }
    },
    birdeye: {
        price: {
            success: {
                value: 1.23,
                updateUnixTime: 1234567890,
                updateTime: '2024-01-01T00:00:00Z'
            },
            error: {
                error: 'Token price not found',
                status: 404
            }
        },
        ohlcv: {
            success: [{
                unixTime: 1234567890,
                time: '2024-01-01T00:00:00Z',
                open: 1.0,
                high: 1.5,
                low: 0.5,
                close: 1.2,
                volume: 1000
            }],
            error: {
                error: 'Invalid OHLCV parameters',
                status: 400
            }
        },
        orderBook: {
            success: {
                asks: [{ price: 1.1, size: 100 }],
                bids: [{ price: 0.9, size: 100 }],
                updateUnixTime: 1234567890
            },
            error: {
                error: 'Order book service unavailable',
                status: 503
            }
        },
        tokenSearch: {
            success: [{
                address: 'token-address',
                chainId: 1,
                decimals: 18,
                name: 'Test Token',
                symbol: 'TEST',
                logoURI: 'https://test.com/logo.png'
            }],
            error: {
                error: 'Token search service unavailable',
                status: 502
            }
        }
    },
    jupiter: {
        price: {
            success: {
                price: 1.23,
                timestamp: 1234567890000
            },
            error: {
                error: 'Token price not found',
                status: 404
            }
        },
        ohlcv: {
            success: [{
                timestamp: 1234567890000,
                open: 1.0,
                high: 1.5,
                low: 0.5,
                close: 1.2,
                volume: 1000
            }],
            error: {
                error: 'Invalid OHLCV parameters',
                status: 400
            }
        },
        orderBook: {
            success: {
                asks: [{ price: 1.1, size: 100 }],
                bids: [{ price: 0.9, size: 100 }],
                timestamp: 1234567890000
            },
            error: {
                error: 'Order book service unavailable',
                status: 503
            }
        },
        tokenSearch: {
            success: [{
                address: 'token-address',
                chainId: 1,
                decimals: 18,
                name: 'Test Token',
                symbol: 'TEST',
                logoURI: 'https://test.com/logo.png'
            }],
            error: {
                error: 'Token search service unavailable',
                status: 502
            }
        }
    }
};

// Reset all mocks before each test
export const resetMocks = () => {
    mockFetch.mockReset();
    // Reset to default successful response
    mockFetch.mockImplementation(async () => new MockResponse({}, { status: 200 }));
    vi.clearAllMocks();
}; 