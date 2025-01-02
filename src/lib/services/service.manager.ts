/**
 * @file Service Manager implementation
 * @version 1.0.0
 * @description Manages service lifecycle and dependencies
 */

import type { ManagedLoggingService } from "./managed-logging.service";

export interface ServiceMetadata {
  name: string;
  version: string;
  dependencies: string[];
  isActive: boolean;
  startTime?: number;
  status: ServiceStatus;
}

export enum ServiceStatus {
  PENDING = "pending",
  STARTING = "starting",
  RUNNING = "running",
  STOPPING = "stopping",
  STOPPED = "stopped",
  ERROR = "error",
}

export interface ServiceConfig {
  name: string;
  version: string;
  dependencies?: string[];
}

export interface Service {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ServiceStatus;
  getName(): string;
}

export class ServiceManager {
  private services: Map<string, Service>;
  private metadata: Map<string, ServiceMetadata>;
  private logger: ManagedLoggingService;

  constructor(logger: ManagedLoggingService) {
    this.services = new Map();
    this.metadata = new Map();
    this.logger = logger;
  }

  register(service: Service, config: ServiceConfig): void {
    const name = service.getName();
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    this.services.set(name, service);
    this.metadata.set(name, {
      name: config.name,
      version: config.version,
      dependencies: config.dependencies || [],
      isActive: false,
      status: service.getStatus(),
    });

    this.logger.info(`Service ${name} registered`, { config });
  }

  deregister(name: string): void {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} is not registered`);
    }

    const service = this.services.get(name)!;
    if (service.getStatus() === ServiceStatus.RUNNING) {
      throw new Error(`Service ${name} must be stopped before deregistering`);
    }

    this.services.delete(name);
    this.metadata.delete(name);

    this.logger.info(`Service ${name} deregistered`);
  }

  async initialize(): Promise<void> {
    try {
      // Start the logger first
      await this.logger.start();

      // Log initialization start
      this.logger.info("Initializing service manager");

      // Validate dependencies
      this.validateDependencies();

      this.logger.info("Service manager initialized");
    } catch (error) {
      this.logger.error("Failed to initialize service manager:", { error });
      throw error;
    }
  }

  private validateDependencies(): void {
    const registeredServices = new Set(this.services.keys());

    for (const [name, metadata] of this.metadata.entries()) {
      for (const dependency of metadata.dependencies) {
        if (!registeredServices.has(dependency)) {
          throw new Error(
            `Service ${name} depends on unregistered service ${dependency}`,
          );
        }
      }
    }
  }

  private async startService(
    name: string,
    visited: Set<string>,
  ): Promise<void> {
    if (visited.has(name)) {
      throw new Error(`Circular dependency detected for service ${name}`);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    const metadata = this.metadata.get(name)!;
    if (metadata.isActive) {
      return;
    }

    visited.add(name);

    // Start dependencies first
    for (const dependency of metadata.dependencies) {
      await this.startService(dependency, visited);
    }

    visited.delete(name);

    try {
      this.logger.info(`Starting service ${name}`);
      await service.start();
      metadata.isActive = true;
      metadata.startTime = Date.now();
      metadata.status = service.getStatus();
      this.logger.info(`Service ${name} started successfully`);
    } catch (error) {
      metadata.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to start service ${name}:`, { error });
      throw error;
    }
  }

  async startAll(): Promise<void> {
    try {
      this.logger.info("Starting all services");

      const visited = new Set<string>();
      for (const name of this.services.keys()) {
        await this.startService(name, visited);
      }

      this.logger.info("All services started successfully");
    } catch (error) {
      this.logger.error("Failed to start all services:", { error });
      throw error;
    }
  }

  private async stopService(name: string, visited: Set<string>): Promise<void> {
    if (visited.has(name)) {
      throw new Error(`Circular dependency detected for service ${name}`);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    const metadata = this.metadata.get(name)!;
    if (!metadata.isActive) {
      return;
    }

    visited.add(name);

    // Find services that depend on this one
    const dependents = Array.from(this.metadata.entries())
      .filter(([_, meta]) => meta.dependencies.includes(name))
      .map(([dependentName]) => dependentName);

    // Stop dependent services first
    for (const dependent of dependents) {
      await this.stopService(dependent, visited);
    }

    visited.delete(name);

    try {
      this.logger.info(`Stopping service ${name}`);
      await service.stop();
      metadata.isActive = false;
      metadata.status = service.getStatus();
      this.logger.info(`Service ${name} stopped successfully`);
    } catch (error) {
      metadata.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to stop service ${name}:`, { error });
      throw error;
    }
  }

  async stopAll(): Promise<void> {
    try {
      this.logger.info("Stopping all services");

      const visited = new Set<string>();
      // Stop services in reverse dependency order
      const services = Array.from(this.services.keys()).reverse();
      for (const name of services) {
        await this.stopService(name, visited);
      }

      // Stop the logger last
      await this.logger.stop();

      this.logger.info("All services stopped successfully");
    } catch (error) {
      this.logger.error("Failed to stop all services:", { error });
      throw error;
    }
  }

  getServiceMetadata(name: string): ServiceMetadata {
    const metadata = this.metadata.get(name);
    if (!metadata) {
      throw new Error(`Service ${name} not found`);
    }
    return { ...metadata };
  }

  getAllServicesMetadata(): ServiceMetadata[] {
    return Array.from(this.metadata.values()).map((metadata) => ({
      ...metadata,
    }));
  }
}
