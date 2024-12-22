import { PrismaClient } from '@prisma/client';
import { dev } from '$app/environment';

// Use different database URLs for development and production
const databaseUrl = dev 
  ? 'file:./dev.db'  // SQLite for development
  : process.env.DATABASE_URL;  // PostgreSQL for production

// Configure Prisma Client with logging in development
const prismaConfig = dev
  ? { log: ['query', 'error', 'warn'] }
  : {};

// Create a singleton instance of PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);

if (dev) globalForPrisma.prisma = prisma; 