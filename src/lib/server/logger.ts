import winston from 'winston';
import { dev } from '$app/environment';

// Custom log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create the logger
const logger = winston.createLogger({
  level: dev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console(),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Create a request logger middleware
export function logRequest(request: Request, userId?: string | null) {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  
  logger.info('API Request', {
    method,
    path,
    userId,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
  });
}

// Create an error logger
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error(error.message, {
    name: error.name,
    stack: error.stack,
    ...context
  });
}

// Create a response logger
export function logResponse(
  status: number,
  path: string,
  duration: number,
  userId?: string | null
) {
  logger.info('API Response', {
    status,
    path,
    duration: `${duration}ms`,
    userId
  });
}

export { logger }; 