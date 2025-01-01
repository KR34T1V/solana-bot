import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from './$types';
import { mockBirdeyeService as birdeyeService } from '$test/mocks/birdeye-service.mock';
import type { User } from '@prisma/client';

// Augment the App namespace
declare global {
  namespace App {
    interface Locals {
      user: User | null;
    }
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      throw error(401, { message: 'Unauthorized' });
    }

    const { tokenAddress, timeframe } = await request.json();

    // Validate required parameters
    if (!tokenAddress || !timeframe) {
      throw error(400, { message: 'Missing required parameters' });
    }

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      throw error(400, { message: 'Invalid timeframe' });
    }

    // Get active API key
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        userId: locals.user.id,
        isActive: true
      }
    });

    if (!apiKey) {
      throw error(400, { message: 'No active Birdeye API key found' });
    }

    // Fetch OHLCV data
    const historicalData = await birdeyeService.getHistoricalPrices(tokenAddress, timeframe, apiKey.key);

    return json({
      success: true,
      message: 'Historical data fetched successfully',
      data: historicalData
    });
  } catch (err: any) {
    if (err.status) {
      throw err;
    }
    logError(err as Error, { metadata: { path: '/api/data/historical' } });
    throw error(500, { message: 'Failed to fetch historical data' });
  }
}; 