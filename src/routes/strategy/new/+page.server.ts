import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { validateStrategyConfig, validateStrategyName } from '$lib/server/validation';
import type { PrismaClient } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  return {
    strategyTypes: [
      {
        id: 'MEAN_REVERSION',
        name: 'Mean Reversion',
        description: 'Trade based on price deviations from historical averages',
        defaultConfig: {
          timeframe: '1h',
          deviationThreshold: 2,
          lookbackPeriod: 20,
          profitTarget: 1.5,
          stopLoss: 1.0
        }
      },
      {
        id: 'TREND_FOLLOWING',
        name: 'Trend Following',
        description: 'Follow market trends using moving averages and momentum',
        defaultConfig: {
          timeframe: '4h',
          fastMA: 9,
          slowMA: 21,
          momentumPeriod: 14,
          profitTarget: 2.0,
          stopLoss: 1.5
        }
      }
    ]
  };
};

export const actions = {
  create: async ({ request, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: locals.userId }
    });

    if (!user) {
      console.error('User not found:', locals.userId);
      return { success: false, error: 'User not found' };
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const config = formData.get('config') as string;

    if (!name || !type || !config) {
      return { success: false, error: 'Missing required fields' };
    }

    // Validate strategy name
    const nameError = validateStrategyName(name);
    if (nameError) {
      return { success: false, error: nameError.message };
    }

    // Validate strategy configuration
    const validationResult = validateStrategyConfig(type, config);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      };
    }

    try {
      // Create initial version (v1)
      const strategy = await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => {
        // Create strategy
        const newStrategy = await tx.strategy.create({
          data: {
            name,
            type,
            config,
            userId: user.id,
            currentVersion: 1
          }
        });

        // Create initial version
        await tx.strategyVersion.create({
          data: {
            version: 1,
            name,
            type,
            config,
            changes: 'Initial version',
            strategyId: newStrategy.id
          }
        });

        return newStrategy;
      });

      return { success: true, strategy };
    } catch (error: unknown) {
      console.error('Strategy creation error:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
        return { success: false, error: 'Invalid user or strategy relationship' };
      }
      return { success: false, error: 'Failed to create strategy' };
    }
  }
} satisfies Actions; 