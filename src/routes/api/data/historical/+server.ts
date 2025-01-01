import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { BirdeyeService } from '$lib/services/birdeye.service';
import { logger } from '$lib/server/logger';
import type { TimeFrame } from '$lib/types';

interface RequestLocals {
    userId: string | null;
}

interface RequestBody {
    address: string;
    timeframe: string;
    startTime?: string;
    endTime?: string;
}

export const POST: RequestHandler = async ({ request, locals }: { 
    request: Request; 
    locals: RequestLocals 
}) => {
    if (!locals.userId) {
        throw error(401, 'Unauthorized');
    }

    let body: RequestBody;
    try {
        body = await request.json();
    } catch (err) {
        logger.error('Failed to parse request body:', { error: err });
        throw error(400, 'Invalid request body');
    }

    const { address, timeframe } = body;

    // Validate required parameters
    if (!address || !timeframe) {
        logger.warn('Missing required parameters:', { address, timeframe });
        throw error(400, 'Missing required parameters');
    }

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
        logger.warn('Invalid timeframe:', { timeframe, validTimeframes });
        throw error(400, 'Invalid timeframe');
    }

    // Get API key for the user
    const apiKey = await prisma.apiKey.findFirst({
        where: {
            userId: locals.userId,
            provider: 'birdeye',
            isActive: true
        },
        select: {
            key: true
        }
    });

    if (!apiKey) {
        logger.warn('No active Birdeye API key found:', { userId: locals.userId });
        throw error(400, 'No active Birdeye API key found');
    }

    try {
        const birdeyeService = new BirdeyeService(prisma);
        const data = await birdeyeService.getOHLCVData(address, timeframe as TimeFrame, apiKey.key);
        return json(data);
    } catch (err) {
        // If it's already an HTTP error, rethrow it
        if (err instanceof Error && 'status' in err) {
            throw err;
        }
        
        logger.error('Error fetching historical data:', { error: err });
        throw error(500, 'Failed to fetch historical data');
    }
}; 