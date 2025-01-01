import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderFactory } from '../provider.factory';
import { BirdeyeProviderBuilder } from '../birdeye.builder';
import { JupiterProviderBuilder } from '../jupiter.builder';
import type { ProviderConfig } from '$lib/types/provider.types';

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

describe('ProviderFactory', () => {
    let factory: ProviderFactory;
    const mockConfig: ProviderConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        timeout: 5000,
        retryAttempts: 3,
        rateLimits: {
            maxRequests: 10,
            windowMs: 1000,
            retryAfterMs: 1000
        }
    };

    beforeEach(() => {
        factory = ProviderFactory.getInstance();
    });

    describe('getInstance', () => {
        it('should return the same instance', () => {
            const instance1 = ProviderFactory.getInstance();
            const instance2 = ProviderFactory.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('registerBuilder', () => {
        it('should register a builder', () => {
            const builder = new BirdeyeProviderBuilder();
            factory.registerBuilder('birdeye', builder);
            expect(factory.hasBuilder('birdeye')).toBe(true);
        });

        it('should override existing builder', () => {
            const builder1 = new BirdeyeProviderBuilder();
            const builder2 = new BirdeyeProviderBuilder();
            
            factory.registerBuilder('birdeye', builder1);
            factory.registerBuilder('birdeye', builder2);
            
            expect(factory.hasBuilder('birdeye')).toBe(true);
            expect(factory.getRegisteredProviders()).toHaveLength(1);
        });
    });

    describe('createProvider', () => {
        it('should create a provider using registered builder', () => {
            const builder = new BirdeyeProviderBuilder();
            factory.registerBuilder('birdeye', builder);
            
            const provider = factory.createProvider('birdeye', mockConfig);
            expect(provider).toBeDefined();
            expect(provider.name).toBe('birdeye');
        });

        it('should throw error for unregistered provider', () => {
            expect(() => {
                factory.createProvider('unknown', mockConfig);
            }).toThrow('No builder registered for provider: unknown');
        });
    });

    describe('getRegisteredProviders', () => {
        it('should return list of registered providers', () => {
            factory.registerBuilder('birdeye', new BirdeyeProviderBuilder());
            factory.registerBuilder('jupiter', new JupiterProviderBuilder());
            
            const providers = factory.getRegisteredProviders();
            expect(providers).toContain('birdeye');
            expect(providers).toContain('jupiter');
            expect(providers).toHaveLength(2);
        });
    });
}); 