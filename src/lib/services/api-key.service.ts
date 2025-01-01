import type { PrismaClient } from '@prisma/client';
import { logger } from '$lib/server/logger';

interface ApiKeyData {
    userId: string;
    provider: string;
    name: string;
    key: string;
    isActive?: boolean;
    lastVerified?: Date;
}

interface ApiKeyUpdateData {
    isActive?: boolean;
    lastVerified?: Date;
}

export class ApiKeyService {
    constructor(private prisma: PrismaClient) {}

    async upsertApiKey(data: ApiKeyData) {
        try {
            const { userId, provider, name, key, isActive = true, lastVerified } = data;

            return await this.prisma.apiKey.upsert({
                where: {
                    userId_provider: {
                        userId,
                        provider
                    }
                },
                update: {
                    name,
                    key,
                    isActive,
                    lastVerified,
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    provider,
                    name,
                    key,
                    isActive,
                    lastVerified
                }
            });
        } catch (error) {
            logger.error('Failed to upsert API key:', error);
            throw error;
        }
    }

    async getApiKey(userId: string, provider: string) {
        try {
            return await this.prisma.apiKey.findUnique({
                where: {
                    userId_provider: {
                        userId,
                        provider
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to get API key:', error);
            throw error;
        }
    }

    async updateApiKey(userId: string, provider: string, data: ApiKeyUpdateData) {
        try {
            return await this.prisma.apiKey.update({
                where: {
                    userId_provider: {
                        userId,
                        provider
                    }
                },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            logger.error('Failed to update API key:', error);
            throw error;
        }
    }

    async deleteApiKey(userId: string, provider: string) {
        try {
            return await this.prisma.apiKey.delete({
                where: {
                    userId_provider: {
                        userId,
                        provider
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to delete API key:', error);
            throw error;
        }
    }
} 