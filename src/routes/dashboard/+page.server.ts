import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is authenticated
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  // Fetch stats
  const activeStrategies = await prisma.strategy.count({
    where: { userId: locals.userId }
  });

  const activeBots = await prisma.bot.count({
    where: { 
      userId: locals.userId,
      status: 'ACTIVE'
    }
  });

  const trades = await prisma.trade.count({
    where: {
      bot: {
        userId: locals.userId
      }
    }
  });

  const successfulTrades = await prisma.trade.count({
    where: {
      bot: {
        userId: locals.userId
      },
      status: 'COMPLETED'
    }
  });

  return {
    stats: {
      activeStrategies,
      activeBots,
      totalTrades: trades,
      successfulTrades
    }
  };
}; 