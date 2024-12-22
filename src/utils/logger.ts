import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';
import 'winston-daily-rotate-file';

interface LogMetadata {
  price?: number;
  amount?: number;
  strategy?: string;
  error?: Error;
  type?: 'buy' | 'sell';
  [key: string]: any;
}

const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return 'null';
  
  switch (key) {
    case 'price':
      return `$${Number(value).toFixed(2)}`;
    case 'amount':
    case 'balance':
    case 'initialBalance':
      return `${Number(value).toFixed(4)} SOL`;
    case 'duration':
      return `${value}ms`;
    case 'percentage':
    case 'minSpreadPercentage':
      return `${Number(value).toFixed(2)}%`;
    case 'error':
      if (value instanceof Error) {
        return value.stack ? `${value.message}\n${value.stack}` : value.message;
      }
      return String(value);
    case 'dataSource':
      try {
        const obj = typeof value === 'string' ? JSON.parse(value) : value;
        return JSON.stringify(obj, null, 2).replace(/[{}\[\]]/g, chalk.gray('$&'));
      } catch {
        return String(value);
      }
    default:
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2).replace(/[{}\[\]]/g, chalk.gray('$&'));
        } catch {
          return String(value);
        }
      }
      return String(value);
  }
};

const formatTimestamp = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const millis = now.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${millis}`;
};

const tradingFormat = format.printf(({ level, message, ...metadata }) => {
  const timestamp = formatTimestamp();
  const levelPadded = level.toUpperCase().padEnd(5);
  
  // Color configuration
  const levelColor = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.cyan,
    debug: chalk.gray,
  }[level] || chalk.white;

  // Format metadata
  const meta = Object.keys(metadata).length ? 
    Object.entries(metadata)
      .filter(([key]) => !['timestamp', 'level'].includes(key))
      .map(([key, value]) => `${key}=${formatValue(key, value)}`)
      .join(' | ') : '';

  // Construct the log line
  const timestampStr = chalk.gray(`[${timestamp}]`);
  const levelStr = levelColor(`[${levelPadded}]`);
  const messageStr = message;
  const metadataStr = meta ? chalk.gray(` | ${meta}`) : '';

  return `${timestampStr} ${levelStr} ${messageStr}${metadataStr}`;
});

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    tradingFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    }),
    new transports.File({
      filename: 'logs/combined.log',
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    }),
    new transports.DailyRotateFile({
      filename: 'logs/trading-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    })
  ]
});

export const tradingLogger = {
  trade: (type: 'buy' | 'sell', amount: number, price: number, strategy: string) => {
    logger.info(`${type.toUpperCase()} order executed`, {
      type,
      amount,
      price,
      strategy
    });
  },
  
  balance: (amount: number) => {
    logger.info('Current balance', { 
      balance: amount
    });
  },
  
  error: (message: string, error?: Error) => {
    logger.error(message, { 
      error,
      stack: error?.stack
    });
  },
  
  strategy: (name: string, action: string, metadata?: Record<string, any>) => {
    logger.info(`Strategy ${name}`, { 
      action,
      ...metadata
    });
  }
}; 