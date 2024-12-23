export interface BirdeyeTokenPrice {
    value: number;
    updateUnixTime: number;
}

export interface BirdeyePriceResponse {
    success: boolean;
    data: BirdeyeTokenPrice;
    message?: string;
}

export interface BirdeyePairInfo {
    address: string;
    name: string;
    baseToken: string;
    quoteToken: string;
    baseTokenSymbol: string;
    quoteTokenSymbol: string;
    volume24h: number;
    priceChange24h: number;
}

export interface BirdeyePairResponse {
    success: boolean;
    data: BirdeyePairInfo;
    message?: string;
}

export interface BirdeyeOHLCV {
    unixTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface BirdeyeOHLCVResponse {
    success: boolean;
    data: {
        items: BirdeyeOHLCV[];
    };
    message?: string;
} 