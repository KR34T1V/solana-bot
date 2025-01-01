import type { User, ApiKey } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides
  } as User;
}

export function createMockApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    key: faker.string.alphanumeric(32),
    provider: faker.helpers.arrayElement(['birdeye', 'solana']),
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    userId: faker.string.uuid(),
    ...overrides
  } as ApiKey;
} 