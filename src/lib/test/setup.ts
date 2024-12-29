import { vi } from 'vitest'

// Mock SvelteKit's environment modules
vi.mock('$env/dynamic/private', () => ({
  env: {
    BIRDEYE_API_KEY: 'test-api-key',
    DATABASE_URL: 'test-db-url'
  }
}))

vi.mock('$env/dynamic/public', () => ({
  env: {}
}))

// Add any other global test setup here 