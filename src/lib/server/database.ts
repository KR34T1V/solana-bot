import { PrismaClient, Prisma } from '@prisma/client';
import { dev } from '$app/environment';
import { logger } from './logger';

// Use different database URLs for development and production
const databaseUrl = dev 
  ? 'file:./dev.db'  // SQLite for development
  : process.env.DATABASE_URL;  // PostgreSQL for production

logger.info('Initializing database', {
  type: dev ? 'SQLite' : 'PostgreSQL',
  mode: dev ? 'Development' : 'Production',
  url: databaseUrl
});

// Configure Prisma Client with logging in development
const prismaConfig: Prisma.PrismaClientOptions = dev
  ? { 
      log: [
        'query',
        'error',
        'warn'
      ],
    }
  : {};

// Create a singleton instance of PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);

// Set up logging events in development
if (dev) {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    const duration = after - before;

    logger.debug('Database query executed', {
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
      args: JSON.stringify(params.args),
      resultCount: Array.isArray(result) ? result.length : 1
    });

    return result;
  });

  process.on('beforeExit', () => {
    logger.info('Database connection closing', {
      type: dev ? 'SQLite' : 'PostgreSQL',
      mode: dev ? 'Development' : 'Production'
    });
    prisma.$disconnect();
  });

  globalForPrisma.prisma = prisma;
}

logger.info('Database initialized', {
  type: dev ? 'SQLite' : 'PostgreSQL',
  mode: dev ? 'Development' : 'Production',
  logging: dev ? 'Enabled' : 'Disabled'
});