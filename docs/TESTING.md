# Testing Framework Documentation

## Overview

This project uses a comprehensive testing framework built with:
- Vitest for unit and integration testing
- Playwright for E2E testing
- Testing Library for component testing
- Custom utilities and mocks for common testing scenarios

## Test Structure

```
src/
├── test/
│   ├── setup.ts              # Global test setup and mocks
│   ├── utils/               # Test utilities
│   ├── mocks/               # Service mocks
│   ├── matchers/            # Custom test matchers
│   └── factories/           # Test data factories
└── lib/
    └── services/
        └── __tests__/       # Service tests
```

## Running Tests

```bash
# Run all tests
yarn test

# Run tests with UI
yarn test:ui

# Generate coverage report
yarn test:coverage

# Run E2E tests
yarn test:e2e
```

## Test Utilities

### Test Data Factories

```typescript
import { createMockUser } from '$lib/test/factories/user.factory';

const user = createMockUser({
  email: 'custom@email.com'
});
```

### Custom Matchers

```typescript
expect(address).toBeValidSolanaAddress();
expect(transaction).toBeValidTransaction();
expect(value).toBeWithinRange(0, 100);
```

### Mock Services

```typescript
import { mockBirdeyeService } from '$lib/test/mocks/birdeye-service.mock';

beforeEach(() => {
  mockBirdeyeService.setupMockResponses();
});
```

## Best Practices

1. **Test Organization**
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Group related tests using describe blocks

2. **Mocking**
   - Mock external dependencies
   - Use factories for test data
   - Reset mocks between tests

3. **Coverage Requirements**
   - Minimum 80% coverage for all metrics
   - Critical paths must have 100% coverage
   - Edge cases must be tested

4. **Component Testing**
   - Test user interactions
   - Verify accessibility
   - Test error states

## Example Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockUser } from '$lib/test/factories/user.factory';
import { mockBirdeyeService } from '$lib/test/mocks/birdeye-service.mock';

describe('TradingService', () => {
  beforeEach(() => {
    mockBirdeyeService.setupMockResponses();
  });

  it('should fetch token price', async () => {
    // Arrange
    const tokenAddress = 'mock-address';
    
    // Act
    const result = await tradingService.getTokenPrice(tokenAddress);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.value).toBeWithinRange(0, 1000000);
  });
});
```

## Continuous Integration

Tests are automatically run in CI/CD pipeline:
- Pre-commit hooks run tests locally
- GitHub Actions run full test suite
- Coverage reports are generated and tracked
- E2E tests run on staging environment 