import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log all database events
prisma.$on('query', (e) => {
  logger.debug('Database query', {
    query: e.query,
    params: e.params,
    duration: e.duration,
    timestamp: e.timestamp
  });
});

prisma.$on('error', (e) => {
  logger.error('Database error', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

prisma.$on('info', (e) => {
  logger.info('Database info', {
    message: e.message,
    timestamp: e.timestamp
  });
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning', {
    message: e.message,
    timestamp: e.timestamp
  });
});

// Handle connection
prisma.$connect()
  .then(() => {
    logger.info('Database initialized', {
      type: 'SQLite',
      mode: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      logging: 'Enabled'
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to database', {
      error,
      type: 'SQLite',
      mode: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
    });
  });

export { prisma };