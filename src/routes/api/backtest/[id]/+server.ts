import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    throw error(401, 'Unauthorized');
  }

  const backtest = await prisma.backtest.findUnique({
    where: { id: params.id }
  });

  if (!backtest) {
    throw error(404, 'Backtest not found');
  }

  if (backtest.userId !== locals.userId) {
    throw error(403, 'Not authorized to view this backtest');
  }

  return json(backtest);
}; 