import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { prisma } from '$lib/server/prisma';

export class ApiKeyService {
    /**
     * Get active API key for a provider
     */
    async getActiveKey(userId: string, provider: string) {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                userId,
                provider,
                isActive: true
            }
        });

        return apiKey;
    }

    /**
     * Create or update API key
     */
    async upsertApiKey(params: {
        userId: string;
        provider: string;
        name: string;
        key: string;
    }) {
        // Encrypt the API key
        const encryptedKey = this.encryptApiKey(params.key);

        return prisma.apiKey.upsert({
            where: {
                userId_provider: {
                    userId: params.userId,
                    provider: params.provider
                }
            },
            create: {
                name: params.name,
                key: encryptedKey,
                provider: params.provider,
                userId: params.userId,
                isActive: true
            },
            update: {
                name: params.name,
                key: encryptedKey,
                isActive: true
            }
        });
    }

    /**
     * Delete API key
     */
    async deleteApiKey(userId: string, provider: string) {
        return prisma.apiKey.delete({
            where: {
                userId_provider: {
                    userId,
                    provider
                }
            }
        });
    }

    /**
     * Get decrypted API key
     */
    async getDecryptedKey(userId: string, provider: string): Promise<string | null> {
        const apiKey = await this.getActiveKey(userId, provider);
        if (!apiKey) return null;

        return this.decryptApiKey(apiKey.key);
    }

    /**
     * Encrypt API key
     */
    private validateEncryptionKey() {
        const encryptionKey = env.ENCRYPTION_KEY;
        
        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY environment variable is not set. Please add it to your .env file.');
        }
        
        if (encryptionKey.length !== 64) {
            throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one using: openssl rand -hex 32');
        }
        
        try {
            Buffer.from(encryptionKey, 'hex');
        } catch (e) {
            throw new Error('ENCRYPTION_KEY must be a valid hex string. Generate one using: openssl rand -hex 32');
        }
    }

    private encryptApiKey(key: string): string {
        this.validateEncryptionKey();
        
        const algorithm = 'aes-256-cbc';
        const encryptionKey = env.ENCRYPTION_KEY;
        const encryptionKeyBuffer = Buffer.from(encryptionKey!, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, encryptionKeyBuffer, iv);
        
        let encrypted = cipher.update(key, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt API key
     */
    private decryptApiKey(encryptedKey: string): string {
        this.validateEncryptionKey();
        
        const algorithm = 'aes-256-cbc';
        const encryptionKey = env.ENCRYPTION_KEY;
        const encryptionKeyBuffer = Buffer.from(encryptionKey!, 'hex');
        
        const [ivHex, encrypted] = encryptedKey.split(':');
        if (!ivHex || !encrypted) {
            throw new Error('Invalid encrypted key format');
        }
        
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, encryptionKeyBuffer, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
} 