import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderFactory } from '../provider.factory';
import type { MarketDataProvider } from '$lib/types/provider.types';

describe('ProviderFactory', () => {
    let factory: ProviderFactory;

    beforeEach(() => {
        factory = ProviderFactory.getInstance();
        factory.clearProviders();
    });

    it('should be a singleton', () => {
        const instance1 = ProviderFactory.getInstance();
        const instance2 = ProviderFactory.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should register Birdeye provider', () => {
        factory.registerProvider('birdeye', {
            apiKey: 'test-key'
        });

        const provider = factory.getProvider('birdeye');
        expect(provider).toBeDefined();
        expect(provider?.name).toBe('birdeye');
        expect(provider?.priority).toBe(1);
    });

    it('should register Jupiter provider', () => {
        factory.registerProvider('jupiter', {});

        const provider = factory.getProvider('jupiter');
        expect(provider).toBeDefined();
        expect(provider?.name).toBe('jupiter');
        expect(provider?.priority).toBe(2);
    });

    it('should not register unknown provider', () => {
        factory.registerProvider('unknown', {});
        expect(factory.getProvider('unknown')).toBeUndefined();
    });

    it('should not register duplicate provider', () => {
        factory.registerProvider('birdeye', {
            apiKey: 'test-key-1'
        });

        factory.registerProvider('birdeye', {
            apiKey: 'test-key-2'
        });

        const providers = factory.getAllProviders();
        expect(providers.length).toBe(1);
        expect(providers[0].name).toBe('birdeye');
    });

    it('should get providers sorted by priority', () => {
        factory.registerProvider('jupiter', {});
        factory.registerProvider('birdeye', {
            apiKey: 'test-key'
        });

        const providers = factory.getAllProviders();
        expect(providers.length).toBe(2);
        expect(providers[0].name).toBe('birdeye');
        expect(providers[1].name).toBe('jupiter');
    });

    it('should remove provider', () => {
        factory.registerProvider('birdeye', {
            apiKey: 'test-key'
        });

        expect(factory.getProvider('birdeye')).toBeDefined();
        factory.removeProvider('birdeye');
        expect(factory.getProvider('birdeye')).toBeUndefined();
    });

    it('should clear all providers', () => {
        factory.registerProvider('birdeye', {
            apiKey: 'test-key'
        });
        factory.registerProvider('jupiter', {});

        expect(factory.getAllProviders().length).toBe(2);
        factory.clearProviders();
        expect(factory.getAllProviders().length).toBe(0);
    });

    it('should handle case-insensitive provider names', () => {
        factory.registerProvider('BIRDEYE', {
            apiKey: 'test-key'
        });

        expect(factory.getProvider('birdeye')).toBeDefined();
        expect(factory.getProvider('BIRDEYE')).toBeDefined();
        expect(factory.getProvider('Birdeye')).toBeDefined();
    });
}); 