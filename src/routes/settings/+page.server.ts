import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { BirdeyeService } from '$lib/services/birdeye.service';
import { ApiKeyService } from '$lib/services/api-key.service';

// Initialize services
let birdeyeService = new BirdeyeService();
let apiKeyService = new ApiKeyService();

// Allow overriding services for testing
export const setServices = (birdeye: BirdeyeService, apiKey: ApiKeyService) => {
    birdeyeService = birdeye;
    apiKeyService = apiKey;
};

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
            createdAt: true,
            updatedAt: true
        }
    });

    return {
        apiKeys
    };
};

export const actions: Actions = {
    saveBirdeyeKey: async ({ request, locals }) => {
        if (!locals.userId) {
            console.error('Unauthorized: No user ID in locals');
            throw error(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const name = data.get('name')?.toString();
        const key = data.get('key')?.toString();

        console.log('Received API key save request:', { name, hasKey: !!key });

        if (!name || !key) {
            console.error('Missing required fields:', { name: !!name, key: !!key });
            return {
                error: 'Name and API key are required',
                status: 400
            };
        }

        try {
            // Verify the API key
            console.log('Verifying API key...');
            const isValid = await birdeyeService.verifyApiKey(key);
            
            if (!isValid) {
                console.error('Invalid API key');
                return {
                    error: 'Invalid API key',
                    status: 400
                };
            }

            console.log('API key verified, saving...');
            await apiKeyService.upsertApiKey({
                userId: locals.userId,
                provider: 'birdeye',
                name,
                key
            });

            console.log('API key saved successfully');
            return {
                success: true
            };
        } catch (err) {
            console.error('Error saving API key:', err);
            return {
                error: err instanceof Error ? err.message : 'Failed to save API key',
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
            console.error('Error deleting API key:', err);
            return {
                error: 'Failed to delete API key',
                status: 500
            };
        }
    }
}; 