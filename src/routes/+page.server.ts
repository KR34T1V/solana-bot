import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { logger } from '../utils/logger';
import { prisma } from '$lib/server/database';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ depends }) => {
  // Add dependency on 'trades' for real-time updates
  depends('trades');

  try {
    const [activeStrategies, openTrades, closedTrades] = await Promise.all([
      prisma.strategy.findMany({
        where: { isActive: true }
      }).catch(err => {
        logger.error('Failed to fetch active strategies', { error: err });
        throw err;
      }),

      prisma.trade.findMany({
        where: { status: 'OPEN' }
      }).catch(err => {
        logger.error('Failed to fetch open trades', { error: err });
        throw err;
      }),

      prisma.trade.findMany({
        where: { status: 'CLOSED' }
      }).catch(err => {
        logger.error('Failed to fetch closed trades', { error: err });
        throw err;
      })
    ]);

    return {
      activeStrategies,
      openTrades,
      closedTrades
    };
  } catch (err) {
    logger.error('Failed to load page data', { 
      error: err,
      component: 'PageServer',
      stack: err instanceof Error ? err.stack : undefined
    });

    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorInstance = new Error('Failed to load page data');
    errorInstance.cause = errorMessage;

    throw error(500, errorInstance);
  }
};

export const actions: Actions = {
  createStrategy: async ({ request }) => {
    try {
      const data = await request.formData();
      const name = data.get('name')?.toString();
      const description = data.get('description')?.toString();
      const config = data.get('config')?.toString();

      if (!name) {
        logger.warn('Missing strategy name', { component: 'PageServer' });
        return fail(400, { error: 'Strategy name is required' });
      }

      const strategy = await prisma.strategy.create({
        data: {
          name,
          description: description || '',
          configJson: config ? JSON.parse(config) : {}
        }
      });

      logger.info('Strategy created', { 
        strategyId: strategy.id,
        name: strategy.name
      });

      return { success: true, strategy };
    } catch (err) {
      logger.error('Failed to create strategy', {
        error: err,
        component: 'PageServer',
        stack: err instanceof Error ? err.stack : undefined
      });
      return fail(500, { error: 'Failed to create strategy' });
    }
  },

  toggleStrategy: async ({ request }) => {
    try {
      const data = await request.formData();
      const strategyId = Number(data.get('strategyId'));
      const isActive = data.get('isActive') === 'true';

      if (!strategyId) {
        logger.warn('Missing strategy ID', { component: 'PageServer' });
        return fail(400, { error: 'Strategy ID is required' });
      }

      const strategy = await prisma.strategy.update({
        where: { id: strategyId },
        data: { isActive }
      });

      logger.info('Strategy toggled', {
        strategyId: strategy.id,
        isActive: strategy.isActive
      });

      return { success: true };
    } catch (err) {
      logger.error('Failed to toggle strategy', {
        error: err,
        component: 'PageServer',
        stack: err instanceof Error ? err.stack : undefined
      });
      return fail(500, { error: 'Failed to update strategy' });
    }
  },

  deleteStrategy: async ({ request }) => {
    try {
      const data = await request.formData();
      const strategyId = Number(data.get('strategyId'));

      if (!strategyId) {
        logger.warn('Missing strategy ID', { component: 'PageServer' });
        return fail(400, { error: 'Strategy ID is required' });
      }

      await prisma.strategy.delete({
        where: { id: strategyId }
      });

      logger.info('Strategy deleted', { strategyId });

      return { success: true };
    } catch (err) {
      logger.error('Failed to delete strategy', {
        error: err,
        component: 'PageServer',
        stack: err instanceof Error ? err.stack : undefined
      });
      return fail(500, { error: 'Failed to delete strategy' });
    }
  }
}; 