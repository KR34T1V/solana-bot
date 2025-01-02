# Service Manager Documentation

## Overview

The Service Manager system provides a standardized way to manage service lifecycles in the application. It implements a robust state machine for service status management and ensures proper initialization, operation, and cleanup of services.

## Core Concepts

### Service Status

Services can be in one of the following states:

```typescript
enum ServiceStatus {
  PENDING = "PENDING", // Initial state
  STARTING = "STARTING", // Service is initializing
  RUNNING = "RUNNING", // Service is operational
  STOPPING = "STOPPING", // Service is shutting down
  STOPPED = "STOPPED", // Service has been stopped
  ERROR = "ERROR", // Service encountered an error
}
```

### Service Interface

All services must implement the `Service` interface:

```typescript
interface Service {
  getName(): string;
  getStatus(): ServiceStatus;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

## Creating a Managed Service

### 1. Basic Implementation

```typescript
import type { Service } from "./service.manager";
import { ServiceStatus } from "./service.manager";

export class ManagedExampleService implements Service {
  private serviceStatus: ServiceStatus = ServiceStatus.PENDING;

  getName(): string {
    return "example-service";
  }

  getStatus(): ServiceStatus {
    return this.serviceStatus;
  }

  async start(): Promise<void> {
    if (this.serviceStatus === ServiceStatus.RUNNING) {
      throw new Error("Service is already running");
    }

    try {
      this.serviceStatus = ServiceStatus.STARTING;
      // Initialize resources
      this.serviceStatus = ServiceStatus.RUNNING;
    } catch (error) {
      this.serviceStatus = ServiceStatus.ERROR;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.serviceStatus === ServiceStatus.STOPPED) {
      throw new Error("Service is already stopped");
    }

    try {
      this.serviceStatus = ServiceStatus.STOPPING;
      // Cleanup resources
      this.serviceStatus = ServiceStatus.STOPPED;
    } catch (error) {
      this.serviceStatus = ServiceStatus.ERROR;
      throw error;
    }
  }
}
```

### 2. Adding Configuration

```typescript
interface ServiceConfig {
  // Service-specific configuration
  logger: ManagedLoggingService;
  // ... other config options
}

export class ManagedExampleService implements Service {
  private readonly config: ServiceConfig;

  constructor(
    logger: ManagedLoggingService,
    config: Partial<Omit<ServiceConfig, "logger">> = {},
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      logger,
    };
  }
  // ... rest of implementation
}
```

## Testing Managed Services

### 1. Extend BaseServiceTest

```typescript
import { BaseServiceTest } from "../__tests__/base-service.test";

class ManagedExampleServiceTest extends BaseServiceTest {
  protected createService(): Service {
    return new ManagedExampleService(/* dependencies */);
  }

  public beforeAll(): void {
    super.beforeAll();
    // Add service-specific tests
  }
}
```

### 2. Test Lifecycle Methods

```typescript
describe("Service Lifecycle", () => {
  it("should initialize resources on start", async () => {
    await service.start();
    expect(service.getStatus()).toBe(ServiceStatus.RUNNING);
  });

  it("should cleanup resources on stop", async () => {
    await service.stop();
    expect(service.getStatus()).toBe(ServiceStatus.STOPPED);
  });

  it("should handle errors gracefully", async () => {
    // Simulate error condition
    await expect(service.start()).rejects.toThrow();
    expect(service.getStatus()).toBe(ServiceStatus.ERROR);
  });
});
```

## Best Practices

1. **State Management**

   - Always update service status before and after operations
   - Handle errors by setting status to ERROR and rethrowing
   - Validate state transitions

2. **Resource Management**

   - Initialize resources in `start()`
   - Clean up resources in `stop()`
   - Use proper error handling for resource management

3. **Configuration**

   - Use TypeScript interfaces for config
   - Provide sensible defaults
   - Document config options

4. **Error Handling**

   - Use specific error types
   - Log errors appropriately
   - Clean up resources on error

5. **Testing**
   - Test all state transitions
   - Mock external dependencies
   - Test error conditions
   - Verify resource cleanup

## Example Services

1. **ManagedAuthService**

   - Handles user authentication
   - Manages sessions
   - Implements account locking

2. **ManagedLoggingService**
   - Provides logging capabilities
   - Manages log rotation
   - Handles different log levels

## Common Patterns

### 1. Resource Validation

```typescript
private ensureRunning(): void {
  if (this.serviceStatus !== ServiceStatus.RUNNING) {
    throw new Error("Service is not running");
  }
}
```

### 2. Configuration Management

```typescript
const DEFAULT_CONFIG = {
  // Sensible defaults
};

constructor(config: Partial<Config> = {}) {
  this.config = {
    ...DEFAULT_CONFIG,
    ...config,
  };
}
```

### 3. Error Handling

```typescript
try {
  // Operation
} catch (error) {
  this.serviceStatus = ServiceStatus.ERROR;
  this.logger.error("Operation failed", { error });
  throw error;
}
```

## Integration with Other Services

Services can depend on other services:

```typescript
export class ServiceA implements Service {
  constructor(
    private readonly serviceB: ServiceB,
    private readonly serviceC: ServiceC,
  ) {}

  async start(): Promise<void> {
    // Ensure dependencies are running
    if (this.serviceB.getStatus() !== ServiceStatus.RUNNING) {
      await this.serviceB.start();
    }
    // ... start this service
  }
}
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**

   - Check if dependencies are running
   - Verify configuration
   - Check error logs

2. **Service Stuck in STARTING/STOPPING**

   - Check for hanging async operations
   - Verify resource cleanup
   - Check for deadlocks

3. **Resource Leaks**
   - Ensure proper cleanup in stop()
   - Check error handling paths
   - Verify all resources are tracked

### Debug Tips

1. Enable debug logging:

```typescript
const service = new ManagedExampleService({
  logger: new ManagedLoggingService({ level: "debug" }),
});
```

2. Monitor state transitions:

```typescript
service.on("stateChange", (from, to) => {
  console.log(`State changed from ${from} to ${to}`);
});
```

## Migration Guide

### From Legacy Services

1. Implement the `Service` interface
2. Add proper state management
3. Update error handling
4. Add configuration management
5. Update tests to extend `BaseServiceTest`

### Version Updates

When updating service manager versions:

1. Check for interface changes
2. Update state management
3. Verify error handling
4. Update tests
5. Check configuration compatibility
