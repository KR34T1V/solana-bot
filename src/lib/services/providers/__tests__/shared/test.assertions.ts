/**
 * @file Test Assertions
 * @version 1.2.0
 * @module lib/services/providers/__tests__/shared/test.assertions
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { ServiceStatus } from "../../../core/service.manager";
import type {
  PriceData,
  OHLCVData,
  MarketDepth,
} from "../../../../types/provider";

/**
 * Type guard to check if an error is an Error instance
 * @function isError
 * @description Checks if a value is an instance of Error for type-safe error handling
 * @param {unknown} error - Value to check
 * @returns {error is Error} Type predicate indicating if the value is an Error instance
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Assertion result interface
 * @interface AssertionResult
 * @description Standard format for assertion results with success flag and optional message
 */
export interface AssertionResult {
  success: boolean;
  message?: string;
}

/**
 * Test assertions for service operations
 * @namespace assertions
 * @description Collection of assertion utilities for testing service operations
 */
export const assertions = {
  /**
   * Validates service status matches expected value
   * @function expectServiceStatus
   * @description Checks if a service's status matches the expected status
   * @param {ServiceStatus} actual - Actual service status
   * @param {ServiceStatus} expected - Expected service status
   * @returns {AssertionResult} Assertion result
   */
  expectServiceStatus(
    actual: ServiceStatus,
    expected: ServiceStatus,
  ): AssertionResult {
    if (actual !== expected) {
      return {
        success: false,
        message: `Expected service status to be ${expected} but got ${actual}`,
      };
    }
    return { success: true };
  },

  /**
   * Validates that a promise rejects with expected error
   * @function expectRejects
   * @description Verifies that a promise rejects with an error containing the expected code
   * @param {Promise<any>} promise - Promise that should reject
   * @param {string} errorCode - Expected error code
   * @returns {Promise<AssertionResult>} Assertion result
   */
  async expectRejects(
    promise: Promise<any>,
    errorCode: string,
  ): Promise<AssertionResult> {
    try {
      await promise;
      return {
        success: false,
        message: `Expected promise to reject with ${errorCode} but it resolved`,
      };
    } catch (error) {
      if (!isError(error)) {
        return {
          success: false,
          message: `Expected error to be Error instance but got ${typeof error}`,
        };
      }

      if (!error.message.includes(errorCode)) {
        return {
          success: false,
          message: `Expected error to include code ${errorCode} but got: ${error.message}`,
        };
      }

      return { success: true };
    }
  },

  /**
   * Validates price data structure and values
   * @function validatePriceData
   * @description Performs comprehensive validation of price data structure and values
   * @param {PriceData} data - Price data to validate
   * @param {object} options - Validation options
   * @returns {AssertionResult} Assertion result
   */
  validatePriceData(
    data: PriceData,
    options: {
      checkConfidence?: boolean;
      allowZeroPrice?: boolean;
      requireTimestamp?: boolean;
    } = {},
  ): AssertionResult {
    const {
      checkConfidence = false,
      allowZeroPrice = false,
      requireTimestamp = true,
    } = options;

    if (!data) {
      return {
        success: false,
        message: "Price data is null or undefined",
      };
    }

    if (typeof data.price !== "string" && typeof data.price !== "number") {
      return {
        success: false,
        message: `Invalid price type: ${typeof data.price}`,
      };
    }

    const price = Number(data.price);
    if (isNaN(price)) {
      return {
        success: false,
        message: "Price is not a valid number",
      };
    }

    if (!allowZeroPrice && price <= 0) {
      return {
        success: false,
        message: "Price must be greater than zero",
      };
    }

    if (
      checkConfidence &&
      (data.confidence === undefined ||
        data.confidence < 0 ||
        data.confidence > 1)
    ) {
      return {
        success: false,
        message: "Invalid confidence value",
      };
    }

    if (
      requireTimestamp &&
      (!data.timestamp || typeof data.timestamp !== "number")
    ) {
      return {
        success: false,
        message: "Invalid timestamp",
      };
    }

    return { success: true };
  },

  /**
   * Validates OHLCV data structure and values
   * @function validateOHLCVData
   * @description Performs comprehensive validation of OHLCV data structure and values
   * @param {OHLCVData} data - OHLCV data to validate
   * @returns {AssertionResult} Assertion result
   */
  validateOHLCVData(data: OHLCVData): AssertionResult {
    if (!Array.isArray(data)) {
      return {
        success: false,
        message: "OHLCV data must be an array",
      };
    }

    for (const [index, candle] of data.entries()) {
      if (!Array.isArray(candle) || candle.length !== 6) {
        return {
          success: false,
          message: `Invalid candle format at index ${index}`,
        };
      }

      const [timestamp, open, high, low, close, volume] = candle;
      const values = [open, high, low, close, volume];

      if (typeof timestamp !== "number") {
        return {
          success: false,
          message: `Invalid timestamp at index ${index}`,
        };
      }

      for (const [valueIndex, value] of values.entries()) {
        if (typeof value !== "number" || isNaN(value)) {
          return {
            success: false,
            message: `Invalid value at index ${index}, position ${valueIndex}`,
          };
        }
      }

      if (high < Math.max(open, close) || low > Math.min(open, close)) {
        return {
          success: false,
          message: `Invalid OHLC values at index ${index}`,
        };
      }
    }

    return { success: true };
  },

  /**
   * Validates market depth data structure
   * @function validateMarketDepth
   * @description Performs comprehensive validation of market depth data structure and values
   * @param {MarketDepth} data - Market depth data to validate
   * @returns {AssertionResult} Assertion result
   */
  validateMarketDepth(data: MarketDepth): AssertionResult {
    if (!data || typeof data !== "object") {
      return {
        success: false,
        message: "Market depth data must be an object",
      };
    }

    if (!Array.isArray(data.bids) || !Array.isArray(data.asks)) {
      return {
        success: false,
        message: "Bids and asks must be arrays",
      };
    }

    const validateOrders = (
      orders: [number, number][],
      side: "bids" | "asks",
    ): AssertionResult => {
      for (const [index, [price, size]] of orders.entries()) {
        if (typeof price !== "number" || typeof size !== "number") {
          return {
            success: false,
            message: `Invalid ${side} format at index ${index}`,
          };
        }

        if (price <= 0 || size <= 0) {
          return {
            success: false,
            message: `Invalid ${side} values at index ${index}`,
          };
        }
      }
      return { success: true };
    };

    const bidsResult = validateOrders(data.bids, "bids");
    if (!bidsResult.success) return bidsResult;

    const asksResult = validateOrders(data.asks, "asks");
    if (!asksResult.success) return asksResult;

    // Verify price ordering
    for (let i = 1; i < data.bids.length; i++) {
      if (data.bids[i][0] > data.bids[i - 1][0]) {
        return {
          success: false,
          message: `Bids not properly ordered at index ${i}`,
        };
      }
    }

    for (let i = 1; i < data.asks.length; i++) {
      if (data.asks[i][0] < data.asks[i - 1][0]) {
        return {
          success: false,
          message: `Asks not properly ordered at index ${i}`,
        };
      }
    }

    // Verify bid-ask spread
    if (data.bids.length > 0 && data.asks.length > 0) {
      const bestBid = data.bids[0][0];
      const bestAsk = data.asks[0][0];
      if (bestBid >= bestAsk) {
        return {
          success: false,
          message: "Invalid bid-ask spread",
        };
      }
    }

    return { success: true };
  },
};
