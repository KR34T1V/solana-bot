/**
 * @file Example Counter Service
 * @version 1.0.0
 * @description A simple counter service for testing the service test framework
 */

import { ServiceStatus } from "../core/service.manager";
import type { Service } from "../interfaces/service";
import { logger } from "../logging.service";

export interface CounterConfig {
  initialValue?: number;
  maxValue?: number;
}

export class CounterService implements Service {
  private status: ServiceStatus = ServiceStatus.PENDING;
  private counter: number;
  private readonly maxValue: number;

  constructor(config: CounterConfig = {}) {
    this.counter = config.initialValue ?? 0;
    this.maxValue = config.maxValue ?? 100;
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

      // Validate configuration
      if (this.counter > this.maxValue) {
        throw new Error("Initial value cannot be greater than max value");
      }

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
      this.counter = 0;

      this.status = ServiceStatus.STOPPED;
      logger.info("Counter service stopped successfully");
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      logger.error("Failed to stop counter service:", { error });
      throw error;
    }
  }

  // Service-specific methods
  getValue(): number {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new Error("Service must be running to get value");
    }
    return this.counter;
  }

  increment(): number {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new Error("Service must be running to increment");
    }
    if (this.counter >= this.maxValue) {
      this.status = ServiceStatus.ERROR;
      throw new Error("Counter exceeded maximum value");
    }
    return ++this.counter;
  }

  reset(): void {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new Error("Service must be running to reset");
    }
    this.counter = 0;
  }
}
