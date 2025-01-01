import { render } from '@testing-library/svelte';
import type { RenderResult } from '@testing-library/svelte';
import { vi } from 'vitest';

// Custom render function with common providers/wrappers
export function renderWithProviders(
  Component: any,
  props: any = {}
): RenderResult {
  return render(Component, {
    props
  });
}

// Mock Web3 wallet connection
export const mockWalletConnection = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  publicKey: null,
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn()
};

// Helper to create mock API responses
export function createMockApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

// Helper to wait for state updates
export const waitForStateUpdate = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

// Mock blockchain transaction
export const mockTransaction = {
  add: vi.fn(),
  confirm: vi.fn().mockResolvedValue({ success: true }),
  finalize: vi.fn()
};

// Helper to mock Prisma responses
export function createMockPrismaResponse<T>(data: T) {
  return {
    data,
    count: Array.isArray(data) ? data.length : 1
  };
} 