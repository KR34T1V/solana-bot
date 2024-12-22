import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return 'null';
  
  switch (key) {
    case 'duration':
      return `${value}ms`;
    case 'count':
    case 'resultCount':
      return Number(value).toString();
    case 'args':
      try {
        return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    case 'error':
      if (value instanceof Error) {
        return `${value.message}${value.stack ? `\n${value.stack}` : ''}`;
      }
      return String(value);
    default:
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
  }
};

const serverFormat = format.printf((info) => {
  let meta = '';
  if (Object.keys(info).length > 2) { // level and message are standard
    const { level, message, timestamp, ...metadata } = info;
    const formattedMeta = Object.entries(metadata)
      .map(([key, value]) => `${key}=${formatValue(key, value)}`)
      .join(' | ');
    meta = formattedMeta ? ` | ${formattedMeta}` : '';
  }

  const time = info.timestamp ? new Date(info.timestamp as string).toLocaleTimeString() : new Date().toLocaleTimeString();
  return `${time} [${info.level.toUpperCase()}] ${info.message}${meta}`;
});

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    serverFormat
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        serverFormat
      )
    }),
    new transports.DailyRotateFile({
      filename: 'logs/server-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: format.combine(
        format.uncolorize(),
        format.json()
      )
    })
  ]
}); 