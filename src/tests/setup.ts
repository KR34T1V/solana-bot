import { afterEach, expect } from 'vitest';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock global fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};

global.localStorage = localStorageMock as Storage;

// Add custom matchers if needed
expect.extend({
  // Add custom matchers here
}); 