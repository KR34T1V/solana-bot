import { expect } from 'vitest';

expect.extend({
  toBeValidSolanaAddress(received: string) {
    const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(received);
    return {
      pass: isValid,
      message: () =>
        `expected ${received} to ${isValid ? 'not ' : ''}be a valid Solana address`
    };
  },

  toBeValidTransaction(received: any) {
    const hasRequiredProps = 
      received &&
      typeof received === 'object' &&
      'signature' in received &&
      'blockTime' in received;

    return {
      pass: hasRequiredProps,
      message: () =>
        `expected ${received} to ${hasRequiredProps ? 'not ' : ''}be a valid transaction`
    };
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `expected ${received} to ${pass ? 'not ' : ''}be within range ${floor} - ${ceiling}`
    };
  }
}); 