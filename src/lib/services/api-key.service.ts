import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

export class ApiKeyService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Create a new API key
     */
    async createApiKey(userId: string, name: string): Promise<any> {
        try {
            const key = crypto.randomBytes(32).toString('hex');
            return await this.prisma.apiKey.create({
                data: {
                    userId,
                    name,
                    key: this.encryptApiKey(key),
                    provider: 'default'
                }
            });
        } catch (error) {
            throw new Error('Failed to create API key');
        }
    }

    /**
     * Get all API keys for a user
     */
    async getApiKeys(userId: string) {
        return this.prisma.apiKey.findMany({
            where: { userId }
        });
    }

    /**
     * Delete an API key
     */
    async deleteApiKey(keyId: string, userId: string) {
        try {
            return await this.prisma.apiKey.delete({
                where: {
                    id: keyId,
                    userId
                }
            });
        } catch (error) {
            throw new Error('Failed to delete API key');
        }
    }

    /**
     * Validate an API key
     */
    async validateApiKey(key: string): Promise<boolean> {
        const apiKey = await this.prisma.apiKey.findFirst({
            where: { key }
        });
        return !!apiKey;
    }

    /**
     * Get active API key for a provider
     */
    async getActiveKey(userId: string, provider: string) {
        return this.prisma.apiKey.findFirst({
            where: {
                userId,
                provider,
                isActive: true
            }
        });
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
        const encryptedKey = this.encryptApiKey(params.key);

        return this.prisma.apiKey.upsert({
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
            throw new Error('ENCRYPTION_KEY environment variable is not set');
        }
        
        if (encryptionKey.length !== 64) {
            throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
        }
        
        try {
            Buffer.from(encryptionKey, 'hex');
        } catch (e) {
            throw new Error('ENCRYPTION_KEY must be a valid hex string');
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