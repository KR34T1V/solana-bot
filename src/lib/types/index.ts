export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type TradeSide = 'BUY' | 'SELL';
export type TradeType = 'MARKET' | 'LIMIT';
export type TradeStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';

export type BotStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';

export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPEN' | 'CLOSED';

export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRADE';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED'; 