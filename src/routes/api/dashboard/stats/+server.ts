import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      logger.warn('Unauthorized access attempt to dashboard stats');
      return json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching dashboard stats', { userId });

    // Get active strategies count
    const activeStrategies = await prisma.strategy.count({
      where: {
        userId,
      },
    });

    // Get active bots count
    const activeBots = await prisma.bot.count({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    // Get trade statistics
    const trades = await prisma.trade.count({
      where: {
        bot: {
          userId,
        },
      },
    });

    const successfulTrades = await prisma.trade.count({
      where: {
        bot: {
          userId,
        },
        status: 'COMPLETED',
      },
    });

    const stats = {
      activeStrategies,
      activeBots,
      totalTrades: trades,
      successfulTrades,
    };

    logger.debug('Dashboard stats retrieved', { userId, stats });

    return json(stats);
  } catch (error) {
    logError(error as Error, { 
      path: '/api/dashboard/stats',
      userId: locals.userId 
    });
    return json(
      { message: 'An error occurred while fetching dashboard stats' },
      { status: 500 }
    );
  }
}; 