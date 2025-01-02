/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/detection/token-detector
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { type Connection, PublicKey, type Logs } from "@solana/web3.js";
import { EventEmitter } from "events";
import { logger } from "../logging.service";

export interface TokenConfig {
  minDecimals: number;
  maxDecimals: number;
  requiredMetadataFields: string[];
  excludedCreators?: string[];
  minInitialLiquidity?: number;
}

export interface TokenMetadata {
  mint: string;
  decimals: number;
  creator: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface DetectionResult {
  token: TokenMetadata;
  confidence: number;
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  check: string;
  passed: boolean;
  details?: string;
}

type TokenDetectorEvents = {
  detection: (result: DetectionResult) => void;
  error: (error: Error) => void;
};

export class TokenDetector extends EventEmitter {
  private readonly connection: Connection;
  private readonly config: TokenConfig;
  private isRunning: boolean = false;
  private subscriptionId?: number;

  constructor(
    connection: Connection,
    config: TokenConfig = {
      minDecimals: 0,
      maxDecimals: 9,
      requiredMetadataFields: ["name", "symbol"],
    },
  ) {
    super();
    this.connection = connection;
    this.config = config;
  }

  /**
   * Start monitoring for new token mints
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Token detector is already running");
      return;
    }

    try {
      this.subscriptionId = this.connection.onLogs(
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Token Program
        (logs: Logs) => this.handleTokenProgramLogs(logs),
        "confirmed",
      );

      this.isRunning = true;
      logger.info("Token detector started successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to start token detector:", { error: errorMessage });
      throw error;
    }
  }

  /**
   * Stop monitoring for new token mints
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("Token detector is not running");
      return;
    }

    try {
      if (this.subscriptionId !== undefined) {
        await this.connection.removeOnLogsListener(this.subscriptionId);
      }
      this.isRunning = false;
      logger.info("Token detector stopped successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to stop token detector:", { error: errorMessage });
      throw error;
    }
  }

  /**
   * Handle incoming token program logs
   */
  private async handleTokenProgramLogs(logs: Logs): Promise<void> {
    try {
      // Extract mint information from logs
      const mintInfo = await this.extractMintInfo(logs);
      if (!mintInfo) return;

      // Validate the token
      const validationResults = await this.validateToken(mintInfo);
      const confidence = this.calculateConfidence(validationResults);

      // Emit detection result
      const result: DetectionResult = {
        token: mintInfo,
        confidence,
        validationResults,
      };
      this.emit("detection", result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error processing token program logs:", {
        error: errorMessage,
      });
      if (error instanceof Error) {
        this.emit("error", error);
      }
    }
  }

  /**
   * Extract mint information from program logs
   */
  private async extractMintInfo(logs: Logs): Promise<TokenMetadata | null> {
    try {
      // Look for InitializeMint instruction in logs
      const mintLog = logs.logs.find(
        (log: string) =>
          log.includes("InitializeMint") ||
          log.includes("Initialize mint") ||
          log.includes("New token mint"),
      );
      if (!mintLog) return null;

      // Parse program logs to extract mint information
      const mintAddress = this.extractMintAddress(logs.logs);
      if (!mintAddress) return null;

      // Fetch mint account data
      const mintInfo = await this.connection.getParsedAccountInfo(
        new PublicKey(mintAddress),
      );
      if (
        !mintInfo.value ||
        !mintInfo.value.data ||
        typeof mintInfo.value.data !== "object"
      ) {
        return null;
      }

      const data = mintInfo.value.data;
      if (
        !("parsed" in data) ||
        !data.parsed ||
        typeof data.parsed !== "object"
      ) {
        return null;
      }

      const parsed = data.parsed;
      if (
        !("type" in parsed) ||
        parsed.type !== "mint" ||
        !("info" in parsed)
      ) {
        return null;
      }

      const info = parsed.info as Record<string, unknown>;

      // Extract creator from transaction logs
      const creator = this.extractCreator(logs.logs) || "";

      // Construct token metadata
      const metadata: TokenMetadata = {
        mint: mintAddress,
        decimals: typeof info.decimals === "number" ? info.decimals : 0,
        creator,
        timestamp: Date.now(),
        metadata: {
          mintAuthority: info.mintAuthority as string,
          freezeAuthority: info.freezeAuthority as string | null,
          supply: info.supply as string,
        },
      };

      return metadata;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to extract mint info:", { error: errorMessage });
      return null;
    }
  }

  /**
   * Extract mint address from program logs
   */
  private extractMintAddress(logs: string[]): string | null {
    try {
      // Look for the log that contains the mint address
      const mintLog = logs.find(
        (log) =>
          log.includes("Initialize mint") || log.includes("New token mint:"),
      );

      if (!mintLog) return null;

      // Extract the mint address using regex patterns for different log formats
      const patterns = [
        /Initialize mint ([1-9A-HJ-NP-Za-km-z]{32,44})/,
        /New token mint: ([1-9A-HJ-NP-Za-km-z]{32,44})/,
      ];

      for (const pattern of patterns) {
        const match = mintLog.match(pattern);
        if (match && match[1]) {
          try {
            new PublicKey(match[1]);
            return match[1];
          } catch {
            continue;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract creator address from program logs
   */
  private extractCreator(logs: string[]): string | null {
    try {
      // First try to find the signature log
      const signerLog = logs.find((log) => log.includes("Signature:"));
      if (signerLog) {
        const signerMatch = signerLog.match(
          /Signature: ([1-9A-HJ-NP-Za-km-z]{32,44})/,
        );
        if (signerMatch && signerMatch[1]) {
          try {
            new PublicKey(signerMatch[1]);
            return signerMatch[1];
          } catch {
            return null;
          }
        }
      }

      // If no signature log, try to find the mint authority from InitializeMint instruction
      const initLog = logs.find((log) => log.includes("InitializeMint"));
      if (initLog) {
        const authorityMatch = initLog.match(
          /authority: ([1-9A-HJ-NP-Za-km-z]{32,44})/,
        );
        if (authorityMatch && authorityMatch[1]) {
          try {
            new PublicKey(authorityMatch[1]);
            return authorityMatch[1];
          } catch {
            return null;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate a token against configured rules
   *
   * @description
   * Performs a comprehensive validation of a token against predefined rules and configurations.
   * The validation includes checks for:
   * - Token decimals range
   * - Required metadata fields
   * - Creator validation
   *
   * Each validation produces a result that includes:
   * - The specific check performed
   * - Whether the check passed
   * - Detailed information about the validation
   *
   * @param token - The token metadata to validate
   * @returns An array of validation results for each check performed
   *
   * @throws {ValidationError} If token metadata is malformed
   *
   * @example
   * ```typescript
   * const results = await detector.validateToken({
   *   decimals: 9,
   *   metadata: { name: "Test Token", symbol: "TEST" },
   *   creator: "ABC123..."
   * });
   * ```
   */
  private async validateToken(
    token: TokenMetadata,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate decimals
    results.push({
      check: "decimals",
      passed:
        token.decimals >= this.config.minDecimals &&
        token.decimals <= this.config.maxDecimals,
      details: `Token decimals: ${token.decimals}`,
    });

    // Validate metadata fields if present
    if (token.metadata && typeof token.metadata === "object") {
      const missingFields = this.config.requiredMetadataFields.filter(
        (field) => !Object.prototype.hasOwnProperty.call(token.metadata, field),
      );
      results.push({
        check: "metadata",
        passed: missingFields.length === 0,
        details:
          missingFields.length > 0
            ? `Missing required fields: ${missingFields.join(", ")}`
            : undefined,
      });
    }

    // Validate creator
    if (this.config.excludedCreators?.includes(token.creator)) {
      results.push({
        check: "creator",
        passed: false,
        details: "Creator is in exclusion list",
      });
    }

    return results;
  }

  /**
   * Calculate confidence score based on validation results
   *
   * @description
   * Computes a confidence score between 0 and 1 based on the validation results.
   * The score represents how many validation checks passed out of the total checks performed.
   *
   * Confidence Score Interpretation:
   * - 1.0: All checks passed
   * - 0.0: All checks failed
   * - Between 0-1: Partial validation success
   *
   * @param results - Array of validation results to analyze
   * @returns A number between 0 and 1 representing the confidence score
   *
   * @example
   * ```typescript
   * const results = await detector.validateToken(token);
   * const confidence = detector.calculateConfidence(results);
   * if (confidence > 0.8) {
   *   // Token passed most validation checks
   * }
   * ```
   */
  private calculateConfidence(results: ValidationResult[]): number {
    const passedChecks = results.filter((r) => r.passed).length;
    return passedChecks / results.length;
  }

  // Type-safe event emitter methods
  override on<K extends keyof TokenDetectorEvents>(
    event: K,
    listener: TokenDetectorEvents[K],
  ): this {
    return super.on(event, listener);
  }

  override off<K extends keyof TokenDetectorEvents>(
    event: K,
    listener: TokenDetectorEvents[K],
  ): this {
    return super.off(event, listener);
  }

  override emit<K extends keyof TokenDetectorEvents>(
    event: K,
    ...args: Parameters<TokenDetectorEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
