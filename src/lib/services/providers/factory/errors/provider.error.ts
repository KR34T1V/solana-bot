export enum ProviderErrorType {
    Unauthorized = 'UNAUTHORIZED',
    RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
    ServiceUnavailable = 'SERVICE_UNAVAILABLE',
    NotImplemented = 'NOT_IMPLEMENTED',
    InvalidResponse = 'INVALID_RESPONSE',
    NetworkError = 'NETWORK_ERROR',
    NotFound = 'NOT_FOUND',
    BadRequest = 'BAD_REQUEST',
    RateLimited = 'RATE_LIMITED',
    Unknown = 'UNKNOWN'
}

export class ProviderError extends Error {
    constructor(
        public readonly type: ProviderErrorType,
        message: string,
        public readonly provider: string
    ) {
        super(message);
        this.name = 'ProviderError';
    }

    static fromHttpStatus(status: number, message?: string, provider?: string): ProviderError {
        let type: ProviderErrorType;
        let defaultMessage: string;

        switch (status) {
            case 400:
                type = ProviderErrorType.BadRequest;
                defaultMessage = 'Bad request';
                break;
            case 401:
            case 403:
                type = ProviderErrorType.Unauthorized;
                defaultMessage = 'Unauthorized';
                break;
            case 404:
                type = ProviderErrorType.NotFound;
                defaultMessage = 'Resource not found';
                break;
            case 429:
                type = ProviderErrorType.RateLimited;
                defaultMessage = 'Rate limit exceeded';
                break;
            case 501:
                type = ProviderErrorType.NotImplemented;
                defaultMessage = 'Not implemented';
                break;
            case 502:
            case 503:
            case 504:
                type = ProviderErrorType.ServiceUnavailable;
                defaultMessage = 'Service unavailable';
                break;
            default:
                type = ProviderErrorType.Unknown;
                defaultMessage = `HTTP ${status}`;
        }

        return new ProviderError(
            type,
            message || defaultMessage,
            provider || 'unknown'
        );
    }

    static fromError(error: Error, provider?: string): ProviderError {
        if (error instanceof ProviderError) {
            return error;
        }

        // Network errors
        if (error instanceof TypeError && error.message.includes('network')) {
            return new ProviderError(
                ProviderErrorType.NetworkError,
                'Network error occurred',
                provider || 'unknown'
            );
        }

        return new ProviderError(
            ProviderErrorType.Unknown,
            error.message,
            provider || 'unknown'
        );
    }
} 