import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  const strategy = await prisma.strategy.findUnique({
    where: { id: params.id }
  });

  if (!strategy) {
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to edit this strategy');
  }

  return {
    strategy,
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
  update: async ({ request, params, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: params.id }
    });

    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    if (strategy.userId !== locals.userId) {
      return { success: false, error: 'Not authorized to edit this strategy' };
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const config = formData.get('config') as string;

    if (!name || !type || !config) {
      return { success: false, error: 'Missing required fields' };
    }

    try {
      const updatedStrategy = await prisma.strategy.update({
        where: { id: params.id },
        data: {
          name,
          type,
          config
        }
      });

      return { success: true, strategy: updatedStrategy };
    } catch (error) {
      console.error('Strategy update error:', error);
      return { success: false, error: 'Failed to update strategy' };
    }
  },

  delete: async ({ params, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: params.id }
    });

    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    if (strategy.userId !== locals.userId) {
      return { success: false, error: 'Not authorized to delete this strategy' };
    }

    try {
      await prisma.strategy.delete({
        where: { id: params.id }
      });

      throw redirect(302, '/strategy');
    } catch (error) {
      console.error('Strategy deletion error:', error);
      return { success: false, error: 'Failed to delete strategy' };
    }
  }
} satisfies Actions; 