import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is authenticated
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  // Fetch user's strategies
  const strategies = await prisma.strategy.findMany({
    where: { userId: locals.userId },
    orderBy: { createdAt: 'desc' }
  });

  return {
    strategies
  };
}; 