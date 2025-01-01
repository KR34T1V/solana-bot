import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { JupiterService } from '$lib/services/jupiter.service';
import { logger } from '$lib/server/logger';

const jupiterService = new JupiterService();

export const GET: RequestHandler = async ({ url }) => {
    try {
        const tokenAddress = url.searchParams.get('address');
        const days = url.searchParams.get('days');

        if (!tokenAddress) {
            throw error(400, { message: 'Token address is required' });
        }

        if (!days || isNaN(Number(days))) {
            throw error(400, { message: 'Valid days parameter is required' });
        }

        const historicalData = await jupiterService.getOHLCVData(tokenAddress, Number(days));
        
        return json({
            success: true,
            data: historicalData
        });
    } catch (err) {
        logger.error('Historical data error:', err);
        
        if (err instanceof Error) {
            return json({ 
                success: false, 
                error: { message: err.message } 
            }, { status: 400 });
        }
        
        return json({ 
            success: false, 
            error: { message: 'Failed to fetch historical data' } 
        }, { status: 500 });
    }
}; 