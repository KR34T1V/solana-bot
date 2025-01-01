import { logger } from '$lib/server/logger';

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
}

interface RetryConfig {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2
};

/**
 * Builds a URL with query parameters
 */
function buildUrl(baseUrl: string, params?: Record<string, string>): string {
    if (!params) return baseUrl;

    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    return url.toString();
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: Required<RetryConfig>): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
}

/**
 * Determines if a request should be retried based on the error and attempt count
 */
function shouldRetry(error: Error, response: Response | null, attempt: number, config: Required<RetryConfig>): boolean {
    // Don't retry if we've hit the max attempts
    if (attempt >= config.maxAttempts) return false;

    // Retry on network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') return true;

    // Retry on certain status codes
    if (response) {
        const status = response.status;
        return (
            status === 408 || // Request Timeout
            status === 429 || // Too Many Requests
            status === 500 || // Internal Server Error
            status === 502 || // Bad Gateway
            status === 503 || // Service Unavailable
            status === 504    // Gateway Timeout
        );
    }

    return false;
}

/**
 * Fetches a URL with retry logic and error handling
 */
export async function fetchWithRetry(
    url: string,
    options: FetchOptions = {},
    retryConfig: RetryConfig = {}
): Promise<Response> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    const { params, ...fetchOptions } = options;

    const finalUrl = buildUrl(url, params);
    let attempt = 1;
    let lastError: Error | null = null;
    let lastResponse: Response | null = null;

    while (attempt <= config.maxAttempts) {
        try {
            const response = await fetch(finalUrl, fetchOptions);
            
            // If the response is ok, return it
            if (response.ok) return response;

            // Store the response for retry decision
            lastResponse = response;

            // Check for rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after');
                if (retryAfter) {
                    const delayMs = parseInt(retryAfter) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
            }

            // Throw an error to trigger retry logic
            throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (shouldRetry(lastError, lastResponse, attempt, config)) {
                const delayMs = calculateBackoffDelay(attempt, config);
                logger.info(`Retrying request (attempt ${attempt}/${config.maxAttempts}) after ${delayMs}ms delay`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                attempt++;
                continue;
            }

            // If we shouldn't retry, throw the error
            throw lastError;
        }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError || new Error('Maximum retry attempts reached');
} 