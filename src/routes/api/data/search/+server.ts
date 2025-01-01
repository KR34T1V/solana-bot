import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { JupiterService } from '$lib/services/jupiter.service';
import { logger } from '$lib/server/logger';

const jupiterService = new JupiterService();

export const GET: RequestHandler = async ({ url }) => {
    try {
        const query = url.searchParams.get('query');
        if (!query) {
            return json({ 
                success: false, 
                error: { message: 'Search query is required' } 
            }, { status: 400 });
        }

        const tokens = await jupiterService.searchTokens(query);
        return json({ 
            success: true, 
            tokens 
        });
    } catch (error) {
        logger.error('Token search error:', error);
        return json({ 
            success: false, 
            error: { message: 'Failed to search tokens' } 
        }, { status: 500 });
    }
}; 