import { vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { DeepMockProxy } from 'vitest-mock-extended';

// Mock environment variables
vi.mock('$env/static/private', () => ({
  JWT_SECRET: 'test-jwt-secret',
  ENCRYPTION_KEY: 'test-encryption-key'
}));

// Mock auth functions
vi.mock('$lib/server/auth', () => ({
  hashPassword: vi.fn().mockImplementation(async (password: string) => `hashed_${password}`),
  generateToken: vi.fn().mockImplementation(async (userId: string) => `mocked_token_${userId}`),
  verifyPassword: vi.fn().mockImplementation(async (password: string, hashedPassword: string) => {
    return hashedPassword === `hashed_${password}`;
  }),
  verifyToken: vi.fn()
}));

// Create Prisma mock
const prismaMock = mockDeep<PrismaClient>();

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: prismaMock
}));

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Export mock instance
export { prismaMock };

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(url: string, protocols?: string | string[]) {}
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {}
  close(code?: number, reason?: string) {}
}

global.WebSocket = MockWebSocket as any;

// Export mocks for test usage
export {
  mockFetch,
  mockLocalStorage
}; 