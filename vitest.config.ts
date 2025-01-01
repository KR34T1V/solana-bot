import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import path from 'path'
import { loadEnv } from 'vite'

// Load test environment variables
const env = loadEnv('test', process.cwd(), '')

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.{ts,js}', 'src/routes/**/*.{ts,js}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/lib/types/**',
        'src/**/*.config.{js,ts}',
        'src/app.d.ts'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    env: {
      JWT_SECRET: env.JWT_SECRET || 'test-jwt-secret',
      ENCRYPTION_KEY: env.ENCRYPTION_KEY || 'test-encryption-key'
    }
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $test: path.resolve('./src/test')
    }
  }
}); 