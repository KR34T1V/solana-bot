import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { birdeyeService } from '$lib/services';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        if (!locals.userId) {
            return json({ 
                success: false, 
                error: { message: 'Unauthorized' } 
            }, { status: 401 });
        }

        const query = url.searchParams.get('query');
        if (!query) {
            return json({ 
                success: false, 
                error: { message: 'Search query is required' } 
            }, { status: 400 });
        }

        const tokens = await birdeyeService.searchTokens(query, locals.userId);
        return json({ 
            success: true, 
            tokens 
        });
    } catch (err) {
        console.error('Token search error:', err);
        
        // Handle specific error cases
        if (err instanceof Error) {
            if (err.message.includes('API key')) {
                return json({ 
                    success: false, 
                    error: { message: err.message } 
                }, { status: 403 });
            }
            return json({ 
                success: false, 
                error: { message: err.message } 
            }, { status: 500 });
        }
        
        return json({ 
            success: false, 
            error: { message: 'Failed to search tokens' } 
        }, { status: 500 });
    }
}; 