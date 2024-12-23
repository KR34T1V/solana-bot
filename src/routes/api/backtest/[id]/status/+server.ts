import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    throw error(401, 'Unauthorized');
  }

  const backtest = await prisma.backtest.findUnique({
    where: { id: params.id },
    include: {
      strategy: true
    }
  });

  if (!backtest) {
    throw error(404, 'Backtest not found');
  }

  if (backtest.strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to view this backtest');
  }

  return json({
    status: backtest.status,
    results: backtest.results
  });
}; 