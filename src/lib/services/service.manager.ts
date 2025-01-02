/**
 * @file Service Manager implementation
 * @version 1.0.0
 * @description Manages service lifecycle and dependencies
 */

import { logger } from "./logging.service";

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
  private startupOrder: string[];
  private isInitialized: boolean;

  constructor() {
    this.services = new Map();
    this.metadata = new Map();
    this.startupOrder = [];
    this.isInitialized = false;
  }

  /**
   * Register a new service with the manager
   * @param service Service instance to register
   * @param config Service configuration
   */
  register(service: Service, config: ServiceConfig): void {
    if (this.services.has(config.name)) {
      throw new Error(`Service ${config.name} is already registered`);
    }

    this.services.set(config.name, service);
    this.metadata.set(config.name, {
      name: config.name,
      version: config.version,
      dependencies: config.dependencies || [],
      isActive: false,
      status: ServiceStatus.PENDING,
    });

    logger.info("Service registered", {
      service: config.name,
      version: config.version,
    });
  }

  /**
   * Deregister a service from the manager
   * @param name Name of the service to deregister
   */
  async deregister(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} is not registered`);
    }

    const metadata = this.metadata.get(name);
    if (metadata?.isActive) {
      await this.stopService(name);
    }

    this.services.delete(name);
    this.metadata.delete(name);
    this.startupOrder = this.startupOrder.filter((s) => s !== name);

    logger.info("Service deregistered", { service: name });
  }

  /**
   * Initialize the service manager and calculate startup order
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.calculateStartupOrder();
    this.isInitialized = true;

    logger.info("Service manager initialized", {
      serviceCount: this.services.size,
      startupOrder: this.startupOrder,
    });
  }

  /**
   * Start all registered services in dependency order
   */
  async startAll(): Promise<void> {
    if (!this.isInitialized) {
      this.initialize();
    }

    logger.info("Starting all services...");

    for (const serviceName of this.startupOrder) {
      await this.startService(serviceName);
    }

    logger.info("All services started");
  }

  /**
   * Stop all services in reverse dependency order
   */
  async stopAll(): Promise<void> {
    logger.info("Stopping all services...");

    for (const serviceName of [...this.startupOrder].reverse()) {
      await this.stopService(serviceName);
    }

    logger.info("All services stopped");
  }

  /**
   * Get metadata for a specific service
   * @param name Service name
   */
  getServiceMetadata(name: string): ServiceMetadata {
    const metadata = this.metadata.get(name);
    if (!metadata) {
      throw new Error(`Service ${name} not found`);
    }
    return { ...metadata };
  }

  /**
   * Get all registered services metadata
   */
  getAllServicesMetadata(): ServiceMetadata[] {
    return Array.from(this.metadata.values()).map((m) => ({ ...m }));
  }

  /**
   * Start a specific service and its dependencies
   * @param name Service name
   */
  private async startService(name: string): Promise<void> {
    const service = this.services.get(name);
    const metadata = this.metadata.get(name);

    if (!service || !metadata) {
      throw new Error(`Service ${name} not found`);
    }

    if (metadata.isActive) {
      return;
    }

    try {
      metadata.status = ServiceStatus.STARTING;
      await service.start();

      metadata.isActive = true;
      metadata.startTime = Date.now();
      metadata.status = ServiceStatus.RUNNING;

      logger.info("Service started", { service: name });
    } catch (error) {
      metadata.status = ServiceStatus.ERROR;
      logger.error("Failed to start service", {
        service: name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Stop a specific service
   * @param name Service name
   */
  private async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    const metadata = this.metadata.get(name);

    if (!service || !metadata) {
      throw new Error(`Service ${name} not found`);
    }

    if (!metadata.isActive) {
      return;
    }

    try {
      metadata.status = ServiceStatus.STOPPING;
      await service.stop();

      metadata.isActive = false;
      metadata.startTime = undefined;
      metadata.status = ServiceStatus.STOPPED;

      logger.info("Service stopped", { service: name });
    } catch (error) {
      metadata.status = ServiceStatus.ERROR;
      logger.error("Failed to stop service", {
        service: name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Calculate service startup order based on dependencies
   */
  private calculateStartupOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);

      const metadata = this.metadata.get(name);
      if (!metadata) {
        throw new Error(`Service ${name} not found`);
      }

      for (const dep of metadata.dependencies) {
        if (!this.services.has(dep)) {
          throw new Error(`Dependency ${dep} not found for service ${name}`);
        }
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      ordered.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    this.startupOrder = ordered;
  }
}
