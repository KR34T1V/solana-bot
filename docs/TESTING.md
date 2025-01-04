# Testing Guidelines

## Overview
This document outlines the testing standards and practices for the Solana Bot project. We follow a comprehensive testing approach that includes unit tests, integration tests, and end-to-end (E2E) tests.

## Testing Stack
- **Unit & Integration Tests**: Vitest
- **Component Testing**: Testing Library + Svelte
- **E2E Testing**: Playwright
- **Coverage Reports**: V8 Coverage

## Test Types

### 1. Unit Tests
Unit tests should be small, focused, and test a single unit of functionality.

```typescript
// Good example
describe('TradingService', () => {
  it('should validate order parameters', () => {
    const order = TestDataFactory.createMockOrder();
    expect(validateOrder(order)).toBe(true);
  });
});
```

### 2. Integration Tests
Integration tests verify that different parts of the application work together correctly.

```typescript
describe('OrderFlow', () => {
  it('should process order through the entire pipeline', async () => {
    const order = TestDataFactory.createMockOrder();
    const result = await tradingService.processOrder(order);
    expect(result.status).toBe('completed');
  });
});
```

### 3. E2E Tests
E2E tests verify the application works from a user's perspective.

```typescript
test('complete trading flow', async ({ page }) => {
  await page.goto('/trading');
  await page.getByLabel('Symbol').fill('SOL/USDC');
  await expect(page.getByText('Order placed')).toBeVisible();
});
```

## Testing Principles

### 1. Arrange-Act-Assert
Follow the AAA pattern in test cases:
```typescript
it('should process order', async () => {
  // Arrange
  const order = TestDataFactory.createMockOrder();
  
  // Act
  const result = await service.processOrder(order);
  
  // Assert
  expect(result.status).toBe('completed');
});
```

### 2. Test Isolation
- Each test should be independent
- Clean up after each test
- Don't share state between tests
- Use beforeEach for setup

### 3. Mock External Dependencies
```typescript
beforeEach(() => {
  global.fetch = MockResponses.mockFetchSuccess({});
});
```

## Test Organization

### Directory Structure
```
src/
├── tests/
│   ├── unit/
│   │   └── services/
│   ├── integration/
│   │   └── flows/
│   ├── e2e/
│   │   └── features/
│   └── utils/
│       └── test-utils.ts
```

### Naming Conventions
- Test files: `*.test.ts` for unit/integration, `*.spec.ts` for E2E
- Test descriptions: Should clearly describe the expected behavior
- Test utilities: Clear, descriptive names indicating purpose

## Test Data

### Using Test Factories
```typescript
// Create test data using factories
const order = TestDataFactory.createMockOrder({
  symbol: 'SOL/USDC',
  side: 'buy'
});
```

### Mock Responses
```typescript
const successResponse = MockResponses.mockFetchSuccess({
  status: 'completed',
  orderId: '123'
});
```

## Coverage Requirements

### Minimum Coverage Thresholds
- Statements: 80%
- Branches: 80%
- Functions: 90%
- Lines: 80%

### Critical Paths
- Trading operations: 100%
- Risk management: 100%
- Portfolio management: 100%

## Running Tests

### Commands
```bash
# Run all tests
yarn test

# Run with UI
yarn test:ui

# Run with coverage
yarn test:coverage

# Run E2E tests
yarn test:e2e
```

### CI/CD Integration
- Tests must pass before merge
- Coverage reports generated on each PR
- E2E tests run on staging deployments

## Best Practices

### 1. Test Description
```typescript
// Good
it('should reject order when balance is insufficient', async () => {});

// Bad
it('test order rejection', async () => {});
```

### 2. Async Testing
```typescript
// Good
await expect(async () => {
  await service.submitOrder(order);
}).rejects.toThrow();

// Bad
service.submitOrder(order).catch(e => {
  expect(e).toBeDefined();
});
```

### 3. Mocking
```typescript
// Good
const mockFn = vi.fn().mockImplementation(() => 'result');

// Bad
let called = false;
const mockFn = () => { called = true; };
```

## Common Patterns

### 1. Component Testing
```typescript
test('component renders correctly', () => {
  const { getByText } = renderWithProviders(Component, {
    props: { title: 'Test' }
  });
  expect(getByText('Test')).toBeInTheDocument();
});
```

### 2. Error Testing
```typescript
test('handles errors appropriately', async () => {
  global.fetch = MockResponses.mockFetchError('Network error');
  await expect(service.fetch()).rejects.toThrow();
});
```

### 3. Event Testing
```typescript
test('handles user events', async () => {
  const { getByRole } = renderWithProviders(Component);
  await fireEvent.click(getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

## Debugging Tests

### Using Vitest UI
1. Run `yarn test:ui`
2. Use the interactive UI to debug tests
3. Set breakpoints and inspect state

### Using Playwright Debug
1. Run `yarn test:e2e --debug`
2. Use the Playwright Inspector
3. Step through E2E test execution

## Performance Testing

### Response Time Tests
```typescript
test('order submission completes within 100ms', async () => {
  const start = performance.now();
  await service.submitOrder(order);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});
```

## Security Testing

### Authentication Tests
```typescript
test('rejects unauthorized access', async () => {
  const service = new TradingService({ token: 'invalid' });
  await expect(service.submitOrder(order))
    .rejects.toThrow('Unauthorized');
});
```

## Maintenance

### Regular Tasks
1. Update test dependencies monthly
2. Review and update mocks for external services
3. Maintain test data factories
4. Review and update coverage thresholds

### Documentation
1. Keep this guide updated
2. Document new testing patterns
3. Update setup instructions
4. Maintain troubleshooting guides 