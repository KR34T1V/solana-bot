import { render } from '@testing-library/svelte';
import type { RenderResult } from '@testing-library/svelte';
import { vi, beforeAll, afterAll } from 'vitest';
import type { Mock } from 'vitest';

// Custom render function with common providers/context if needed
export function renderWithProviders(
  Component: any,
  props = {}
): RenderResult<any> {
  return render(Component, {
    props,
    // Add any providers/context here
  });
}

// Test data factory
export class TestDataFactory {
  static createMockOrder(override: Partial<any> = {}) {
    return {
      id: 'test-order-id',
      symbol: 'SOL/USDC',
      side: 'buy',
      type: 'limit',
      price: 100,
      size: 1,
      status: 'new',
      ...override,
    };
  }

  static createMockPortfolio(override: Partial<any> = {}) {
    return {
      id: 'test-portfolio-id',
      balance: 1000,
      positions: [],
      ...override,
    };
  }
}

// Mock service responses
export class MockResponses {
  static mockFetchSuccess(data: any): Mock {
    return vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      })
    );
  }

  static mockFetchError(error: string): Mock {
    return vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error }),
      })
    );
  }
}

// Test helpers
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockConsoleError = () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
}; 