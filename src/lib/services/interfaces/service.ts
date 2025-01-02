/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/interfaces/service
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { ServiceStatus } from "../core/service.manager";

/**
 * Base interface that all services must implement
 */
export interface Service {
  /**
   * Start the service
   */
  start(): Promise<void>;

  /**
   * Stop the service
   */
  stop(): Promise<void>;

  /**
   * Get the current status of the service
   */
  getStatus(): ServiceStatus;

  /**
   * Get the service name
   */
  getName(): string;
}

/**
 * Configuration interface for services
 */
export interface ServiceConfig {
  /**
   * Service name
   */
  name: string;

  /**
   * Service version
   */
  version: string;

  /**
   * Service dependencies
   */
  dependencies?: string[];
}

/**
 * Service metadata interface
 */
export interface ServiceMetadata {
  /**
   * Service name
   */
  name: string;

  /**
   * Service version
   */
  version: string;

  /**
   * Service dependencies
   */
  dependencies: string[];

  /**
   * Whether the service is active
   */
  isActive: boolean;

  /**
   * Service start time
   */
  startTime?: number;

  /**
   * Current service status
   */
  status: ServiceStatus;
}
