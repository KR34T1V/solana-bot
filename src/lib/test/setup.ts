import { vi } from 'vitest'

// Mock SvelteKit's environment modules
vi.mock('$env/dynamic/private', () => ({
  env: {
    BIRDEYE_API_KEY: 'test-api-key',
    DATABASE_URL: 'test-db-url',
    ENCRYPTION_KEY: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' // 64 chars hex
  }
}))

vi.mock('$env/dynamic/public', () => ({
  env: {}
}))

// Add any other global test setup here 