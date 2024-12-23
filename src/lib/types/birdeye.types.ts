export interface BirdeyeTokenPrice {
    value: number;
    updateUnixTime: number;
    updateTime: string;
}

export interface BirdeyeOHLCV {
    unixTime: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface BirdeyeTokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
    icon: string;
}

export interface BirdeyePairInfo {
    pair_address: string;
    base_token: BirdeyeTokenInfo;
    quote_token: BirdeyeTokenInfo;
    liquidity: number;
    volume_24h: number;
}

// API Response Types
export interface BirdeyePriceResponse {
    data: Record<string, BirdeyeTokenPrice>;
    success: boolean;
    timestamp: number;
}

export interface BirdeyeOHLCVResponse {
    data: {
        items: BirdeyeOHLCV[];
    };
    success: boolean;
    timestamp: number;
}

export interface BirdeyePairResponse {
    data: BirdeyePairInfo;
    success: boolean;
    timestamp: number;
} 