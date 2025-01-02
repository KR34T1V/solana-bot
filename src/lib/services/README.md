# Services

This directory contains all managed services used in the application. Each service follows the Service Manager pattern for consistent lifecycle management and resource handling.

## Directory Structure

```
services/
├── core/               # Core services (auth, logging, etc.)
│   ├── managed-auth.ts
│   ├── managed-logging.ts
│   └── service.manager.ts
├── sniping/           # Trading and sniping services
│   └── managed-token-sniper.ts
├── __tests__/         # Base test implementations
│   └── base-service.test.ts
└── README.md          # This file
```

## Available Services

### Core Services

1. **ManagedAuthService**

   - User authentication and session management
   - Account locking and security features
   - JWT token handling

2. **ManagedLoggingService**
   - Structured logging with Winston
   - Log rotation and management
   - Different log levels and contexts

### Trading Services

1. **ManagedTokenSniper**
   - Token sniping and trading strategies
   - Real-time price monitoring
   - Trade execution

## Getting Started

1. Read the [Service Manager Documentation](../../docs/services/SERVICE_MANAGER.md)
2. Check individual service documentation in their respective files
3. See test implementations for usage examples

## Creating New Services

1. Implement the `Service` interface
2. Follow the managed service pattern
3. Add comprehensive tests
4. Document the service

## Testing

All services must extend `BaseServiceTest` for consistent testing:

```typescript
import { BaseServiceTest } from "./__tests__/base-service.test";

class YourServiceTest extends BaseServiceTest {
  protected createService(): Service {
    return new YourService();
  }
}
```

## Best Practices

1. Always handle service lifecycle properly
2. Use proper error handling and logging
3. Clean up resources in stop()
4. Add comprehensive tests
5. Document public APIs
