import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is authenticated
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

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const config = formData.get('config') as string;

    if (!name || !type || !config) {
      return { success: false, error: 'Missing required fields' };
    }

    try {
      const strategy = await prisma.strategy.create({
        data: {
          name,
          type,
          config,
          userId: locals.userId
        }
      });

      return { success: true, strategy };
    } catch (error) {
      console.error('Strategy creation error:', error);
      return { success: false, error: 'Failed to create strategy' };
    }
  }
} satisfies Actions; 