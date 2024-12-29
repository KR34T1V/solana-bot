import { describe, it, expect } from 'vitest';
import { load } from '../+layout.server';

describe('Layout Server', () => {
    it('should load user data', async () => {
        const result = await load({
            locals: { userId: 'test-user' }
        } as any);

        expect(result).toEqual({
            userId: 'test-user'
        });
    });

    it('should handle unauthenticated user', async () => {
        const result = await load({
            locals: { userId: null }
        } as any);

        expect(result).toEqual({
            userId: null
        });
    });
}); 