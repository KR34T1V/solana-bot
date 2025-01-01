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
        info: vi.fn()
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
            throw new Error(`HTTP error! status: ${this.status}`);
        }
        return Promise.resolve(this.responseData);
    }

    async text(): Promise<string> {
        if (!this.ok) {
            throw new Error(`HTTP error! status: ${this.status}`);
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

// Reset all mocks before each test
export const resetMocks = () => {
    mockFetch.mockReset();
    // Reset to default successful response
    mockFetch.mockImplementation(async () => new MockResponse({}, { status: 200 }));
    vi.clearAllMocks();
}; 