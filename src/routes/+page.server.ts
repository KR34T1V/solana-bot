import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // This is where we'll add server-side data fetching
  // For now, let's return some mock data
  return {
    stats: {
      totalTrades: 150,
      successRate: 68.5,
      profitLoss: '+12.3%',
      activeStrategies: 3
    }
  };
}; 