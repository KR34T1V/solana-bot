import { faker } from '@faker-js/faker';

export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export function createRegistrationData(overrides: Partial<RegistrationData> = {}): RegistrationData {
  const password = faker.internet.password({ length: 12 });
  return {
    email: faker.internet.email().toLowerCase(),
    password,
    confirmPassword: password,
    ...overrides
  };
}

export function createLoginData(overrides: Partial<LoginData> = {}): LoginData {
  return {
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    ...overrides
  };
}

export function createInvalidRegistrationData(): Partial<RegistrationData>[] {
  return [
    { email: 'invalid-email', password: 'password123', confirmPassword: 'password123' },
    { email: faker.internet.email(), password: '123', confirmPassword: '123' }, // Too short password
    { email: faker.internet.email(), password: 'password123', confirmPassword: 'different123' }, // Mismatched passwords
    { email: '', password: 'password123', confirmPassword: 'password123' }, // Empty email
    { email: faker.internet.email(), password: '', confirmPassword: '' } // Empty password
  ];
} 