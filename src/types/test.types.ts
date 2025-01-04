/**
 * @file Test Types
 * @version 1.0.0
 * @module types/test.types
 * @author Development Team
 * @lastModified 2025-01-02
 */

export interface EndpointMetrics {
  requestCount: number;
  latency: number;
  errorRate: number;
  successRate: number;
}

export interface TestEndpoint {
  url: string;
  weight: number;
  latency: number;
  errorRate: number;
}

export interface Alert {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface PriceData {
  price: number;
  timestamp: number;
} 