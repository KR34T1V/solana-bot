import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { MarketDataService } from '$lib/services/market-data.service';
import { ApiKeyService } from '$lib/services/api-key.service';
import { logger } from '$lib/server/logger';

// Initialize services
const marketDataService = new MarketDataService();
const apiKeyService = new ApiKeyService(prisma);

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.userId) {
        throw redirect(302, '/auth/login');
    }

    const apiKeys = await prisma.apiKey.findMany({
        where: {
            userId: locals.userId
        },
        select: {
            id: true,
            name: true,
            provider: true,
            isActive: true,
            lastVerified: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return {
        apiKeys
    };
};

export const actions: Actions = {
    saveApiKey: async ({ request, locals }) => {
        if (!locals.userId) {
            logger.error('Unauthorized: No user ID in locals');
            throw error(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const name = data.get('name')?.toString();
        const key = data.get('key')?.toString();
        const provider = data.get('provider')?.toString();

        logger.info('Received API key save request:', { metadata: { name, provider, hasKey: !!key } });

        if (!name || !key || !provider) {
            logger.error('Missing required fields:', { metadata: { name: !!name, key: !!key, provider: !!provider } });
            return {
                error: 'Name, API key, and provider are required',
                status: 400
            };
        }

        try {
            // Verify the API key using the market data service
            logger.info('Verifying API key...', { metadata: { provider } });
            
            // Register the provider temporarily for verification
            await marketDataService.registerProvider(provider, {
                apiKey: key,
                baseUrl: '', // The base URL will be determined by the provider
                timeout: 5000,
                retryAttempts: 3,
                rateLimits: {
                    maxRequests: 10,
                    windowMs: 1000,
                    retryAfterMs: 1000
                }
            });

            // If registration succeeds, the API key is valid
            logger.info('API key verified, saving...', { metadata: { provider } });
            
            await apiKeyService.upsertApiKey({
                userId: locals.userId,
                provider,
                name,
                key,
                isActive: true,
                lastVerified: new Date()
            });

            logger.info('API key saved successfully', { metadata: { provider } });
            return {
                success: true
            };
        } catch (err) {
            logger.error('Error saving API key:', err);
            return {
                error: err instanceof Error ? err.message : 'Failed to save API key',
                status: 500
            };
        }
    },

    verifyApiKey: async ({ request, locals }) => {
        if (!locals.userId) {
            throw error(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const provider = data.get('provider')?.toString();

        if (!provider) {
            return {
                error: 'Provider is required',
                status: 400
            };
        }

        try {
            // Get the API key from the database
            const apiKey = await apiKeyService.getApiKey(locals.userId, provider);
            if (!apiKey) {
                return {
                    error: 'API key not found',
                    status: 404
                };
            }

            // Verify the API key using the market data service
            await marketDataService.registerProvider(provider, {
                apiKey: apiKey.key,
                baseUrl: '', // The base URL will be determined by the provider
                timeout: 5000,
                retryAttempts: 3,
                rateLimits: {
                    maxRequests: 10,
                    windowMs: 1000,
                    retryAfterMs: 1000
                }
            });

            // Update the last verified timestamp
            await apiKeyService.updateApiKey(locals.userId, provider, {
                isActive: true,
                lastVerified: new Date()
            });

            return {
                success: true
            };
        } catch (err) {
            logger.error('Error verifying API key:', err);
            
            // Update the API key status to inactive
            await apiKeyService.updateApiKey(locals.userId, provider, {
                isActive: false
            });

            return {
                error: err instanceof Error ? err.message : 'Failed to verify API key',
                status: 500
            };
        }
    },

    deleteApiKey: async ({ request, locals }) => {
        if (!locals.userId) {
            throw error(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const provider = data.get('provider')?.toString();

        if (!provider) {
            return {
                error: 'Provider is required',
                status: 400
            };
        }

        try {
            await apiKeyService.deleteApiKey(locals.userId, provider);
            return {
                success: true
            };
        } catch (err) {
            logger.error('Error deleting API key:', err);
            return {
                error: 'Failed to delete API key',
                status: 500
            };
        }
    }
}; 