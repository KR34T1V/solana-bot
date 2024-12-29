import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Prisma Module', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalGlobal = globalThis as any;

  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = originalEnv;
    if (originalGlobal.prisma) delete originalGlobal.prisma;
  });

  it('should create a new PrismaClient instance', async () => {
    const { prisma } = await import('../prisma');
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('should reuse existing PrismaClient instance in development', async () => {
    process.env.NODE_ENV = 'development';
    
    const { prisma: prisma1 } = await import('../prisma');
    expect(prisma1).toBeInstanceOf(PrismaClient);
    
    const { prisma: prisma2 } = await import('../prisma');
    expect(prisma2).toBe(prisma1);
  });

  it('should not store PrismaClient instance globally in production', async () => {
    process.env.NODE_ENV = 'production';
    
    const { prisma } = await import('../prisma');
    expect(prisma).toBeInstanceOf(PrismaClient);
    expect((globalThis as any).prisma).toBeUndefined();
  });
}); 