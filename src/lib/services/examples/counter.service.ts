/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/examples/counter.service
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { ServiceStatus } from "../core/service.manager";
import type { Service } from "../interfaces/service";
import { logger } from "../logging.service";

export interface CounterConfig {
  initialValue?: number;
  minValue?: number;
  maxValue?: number;
}

export class CounterService implements Service {
  private status: ServiceStatus = ServiceStatus.PENDING;
  private counter: number;
  private readonly minValue: number;
  private readonly maxValue: number;

  constructor(config: CounterConfig = {}) {
    // Validate min/max values
    const minValue = config.minValue ?? 0;
    const maxValue = config.maxValue ?? 100;

    if (minValue >= maxValue) {
      throw new Error("Min value must be less than max value");
    }

    // Validate initial value
    const initialValue = config.initialValue ?? minValue;
    if (initialValue < minValue || initialValue > maxValue) {
      throw new Error("Initial value must be between min and max");
    }

    this.counter = initialValue;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  getName(): string {
    return "counter-service";
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  async start(): Promise<void> {
    try {
      if (this.status === ServiceStatus.RUNNING) {
        throw new Error("Service is already running");
      }

      this.status = ServiceStatus.STARTING;
      logger.info("Starting counter service", { initialValue: this.counter });

      this.status = ServiceStatus.RUNNING;
      logger.info("Counter service started successfully");
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      logger.error("Failed to start counter service:", { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.status === ServiceStatus.STOPPED) {
        throw new Error("Service is already stopped");
      }

      this.status = ServiceStatus.STOPPING;
      logger.info("Stopping counter service");

      // Reset counter
      this.counter = this.minValue;

      this.status = ServiceStatus.STOPPED;
      logger.info("Counter service stopped successfully");
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      logger.error("Failed to stop counter service:", { error });
      throw error;
    }
  }

  private validateRunning(operation: string): void {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new Error(`Service not running: cannot ${operation}`);
    }
  }

  // Service-specific methods
  getValue(): number {
    this.validateRunning("get value");
    return this.counter;
  }

  increment(): number {
    this.validateRunning("increment");
    if (this.counter >= this.maxValue) {
      throw new Error("Counter exceeded maximum value");
    }
    return ++this.counter;
  }

  reset(): void {
    this.validateRunning("reset");
    this.counter = this.minValue;
  }
}
