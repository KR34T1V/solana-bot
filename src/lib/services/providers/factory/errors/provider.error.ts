export enum ProviderErrorType {
    Unknown = 'UNKNOWN',
    NotFound = 'NOT_FOUND',
    Unauthorized = 'UNAUTHORIZED',
    RateLimited = 'RATE_LIMITED',
    ServiceUnavailable = 'SERVICE_UNAVAILABLE',
    InvalidResponse = 'INVALID_RESPONSE'
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
            case 401:
            case 403:
                type = ProviderErrorType.Unauthorized;
                defaultMessage = 'Unauthorized';
                break;
            case 404:
                type = ProviderErrorType.NotFound;
                defaultMessage = 'Not found';
                break;
            case 429:
                type = ProviderErrorType.RateLimited;
                defaultMessage = 'Rate limited';
                break;
            case 503:
                type = ProviderErrorType.ServiceUnavailable;
                defaultMessage = 'Service unavailable';
                break;
            default:
                type = ProviderErrorType.Unknown;
                defaultMessage = 'Unknown error';
        }

        return new ProviderError(type, message || defaultMessage, provider || 'unknown');
    }

    static fromError(error: Error, provider?: string): ProviderError {
        if (error instanceof ProviderError) {
            return error;
        }
        return new ProviderError(ProviderErrorType.Unknown, error.message, provider || 'unknown');
    }
} 