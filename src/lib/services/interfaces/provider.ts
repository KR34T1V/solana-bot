/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/interfaces/provider
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { Service } from "./service";

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  /**
   * API endpoint URL
   */
  endpoint: string;

  /**
   * API key (if required)
   */
  apiKey?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Maximum retries for failed requests
   */
  maxRetries?: number;

  /**
   * Cache TTL in milliseconds
   */
  cacheTTL?: number;
}

/**
 * Base interface for provider services
 */
export interface Provider extends Service {
  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Get the provider endpoint
   */
  getEndpoint(): string;

  /**
   * Check if the provider is ready
   */
  isReady(): boolean;

  /**
   * Get the provider configuration
   */
  getConfig(): ProviderConfig;

  /**
   * Clear the provider cache
   */
  clearCache(): void;
}
