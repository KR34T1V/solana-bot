import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '$test/setup';
import { createRegistrationData } from '$test/factories/auth.factory';
import type { RegistrationData } from '$test/factories/auth.factory';
import { createRequestEvent } from '$test/utils/request-utils';
import { validateSuccessResponse, validateErrorResponse, validatePrismaCall } from '$test/utils/response-utils';
import { POST } from '../../../../routes/api/auth/register/+server';

const ROUTE_ID = '/api/auth/register';

describe('POST /api/auth/register', () => {
  let validRegistrationData: RegistrationData;

  beforeEach(() => {
    validRegistrationData = createRegistrationData();
  });

  it('should successfully register a new user', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validRegistrationData,
      routeId: ROUTE_ID
    });

    const mockUser = {
      id: 'mock-user-id',
      email: validRegistrationData.email,
      password: expect.any(String),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(mockUser);

    // Act
    const response = await POST(event);

    // Assert
    await validateSuccessResponse(response, 201);
    validatePrismaCall(prismaMock.user.create, {
      data: {
        email: validRegistrationData.email,
        password: expect.any(String)
      }
    });
  });

  it('should prevent registration with existing email', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validRegistrationData,
      routeId: ROUTE_ID
    });

    const existingUser = {
      id: 'existing-user-id',
      email: validRegistrationData.email,
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    prismaMock.user.findUnique.mockResolvedValue(existingUser);

    // Act
    const response = await POST(event);

    // Assert
    await validateErrorResponse(response, 400, 'Email already registered');
    validatePrismaCall(prismaMock.user.create, undefined, 0);
  });

  describe('validation', () => {
    it.each([
      {
        description: 'should reject invalid email format',
        data: { email: 'invalid-email', password: 'password123', confirmPassword: 'password123' }
      },
      {
        description: 'should reject password shorter than 8 characters',
        data: { email: 'test@example.com', password: '123', confirmPassword: '123' }
      },
      {
        description: 'should reject mismatched passwords',
        data: { email: 'test@example.com', password: 'password123', confirmPassword: 'different123' }
      },
      {
        description: 'should reject empty email',
        data: { email: '', password: 'password123', confirmPassword: 'password123' }
      },
      {
        description: 'should reject empty password',
        data: { email: 'test@example.com', password: '', confirmPassword: '' }
      }
    ])('$description', async ({ data }) => {
      // Arrange
      const event = createRequestEvent({
        method: 'POST',
        url: `http://localhost${ROUTE_ID}`,
        body: data,
        routeId: ROUTE_ID
      });

      // Act
      const response = await POST(event);

      // Assert
      await validateErrorResponse(response, 400);
      validatePrismaCall(prismaMock.user.create, undefined, 0);
    });
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validRegistrationData,
      routeId: ROUTE_ID
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error('Database error'));

    // Act
    const response = await POST(event);

    // Assert
    await validateErrorResponse(response, 500, 'Registration failed');
  });
}); 