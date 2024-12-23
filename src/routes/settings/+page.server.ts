import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { BirdeyeService } from '$lib/services/birdeye.service';
import { ApiKeyService } from '$lib/services/api-key.service';

const birdeyeService = new BirdeyeService();
const apiKeyService = new ApiKeyService();

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
            throw error(401, 'Unauthorized');
        }

        const data = await request.formData();
        const name = data.get('name')?.toString();
        const key = data.get('key')?.toString();

        console.log('Received API key save request:', { name, hasKey: !!key });

        if (!name || !key) {
            console.error('Missing required fields:', { name: !!name, key: !!key });
            return fail(400, {
                error: 'Name and API key are required'
            });
        }

        try {
            // Verify the API key
            console.log('Verifying API key...');
            const isValid = await birdeyeService.verifyApiKey(key);
            
            if (!isValid) {
                console.error('Invalid API key');
                return fail(400, {
                    error: 'Invalid API key'
                });
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
            return fail(500, {
                error: err instanceof Error ? err.message : 'Failed to save API key'
            });
        }
    },

    deleteApiKey: async ({ request, locals }) => {
        if (!locals.userId) {
            throw error(401, 'Unauthorized');
        }

        const data = await request.formData();
        const provider = data.get('provider')?.toString();

        if (!provider) {
            return fail(400, {
                error: 'Provider is required'
            });
        }

        try {
            await apiKeyService.deleteApiKey(locals.userId, provider);
            return {
                success: true
            };
        } catch (error) {
            console.error('Error deleting API key:', error);
            return fail(500, {
                error: 'Failed to delete API key'
            });
        }
    }
}; 