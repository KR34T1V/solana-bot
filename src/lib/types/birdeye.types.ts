export interface TokenPrice {
    value: number;
    updateUnixTime: number;
    updateHour: number;
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
}

export interface TokenPriceHistory {
    prices: TokenPrice[];
    timeframe: string;
    startTime: number;
    endTime: number;
}

export type TimeFrame = '1H' | '1D' | '1W' | '1M' | '1Y';

export interface BirdeyeApiResponse<T> {
    success: boolean;
    data: T;
    timestamp: number;
} 