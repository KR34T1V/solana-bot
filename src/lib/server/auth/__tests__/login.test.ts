import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '$test/setup';
import { createLoginData } from '$test/factories/auth.factory';
import type { LoginData } from '$test/factories/auth.factory';
import { createRequestEvent } from '$test/utils/request-utils';
import { validateSuccessResponse, validateErrorResponse, validatePrismaCall } from '$test/utils/response-utils';
import { POST } from '../../../../routes/api/auth/login/+server';

const ROUTE_ID = '/api/auth/login';

describe('POST /api/auth/login', () => {
  let validLoginData: LoginData;

  beforeEach(() => {
    validLoginData = createLoginData();
  });

  it('should successfully log in a user with valid credentials', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validLoginData,
      routeId: ROUTE_ID
    });

    const mockUser = {
      id: 'mock-user-id',
      email: validLoginData.email,
      password: `hashed_${validLoginData.password}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    // Act
    const response = await POST(event);

    // Assert
    await validateSuccessResponse(response, 200);
    validatePrismaCall(prismaMock.user.findUnique, {
      where: { email: validLoginData.email }
    });
  });

  it('should reject login with non-existent email', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validLoginData,
      routeId: ROUTE_ID
    });

    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const response = await POST(event);

    // Assert
    await validateErrorResponse(response, 401, 'Invalid email or password');
    validatePrismaCall(prismaMock.user.findUnique, {
      where: { email: validLoginData.email }
    });
  });

  it('should reject login with incorrect password', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validLoginData,
      routeId: ROUTE_ID
    });

    const mockUser = {
      id: 'mock-user-id',
      email: validLoginData.email,
      password: `hashed_different_password`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    // Act
    const response = await POST(event);

    // Assert
    await validateErrorResponse(response, 401, 'Invalid email or password');
    validatePrismaCall(prismaMock.user.findUnique, {
      where: { email: validLoginData.email }
    });
  });

  describe('validation', () => {
    it.each([
      {
        description: 'should reject missing email',
        data: { email: '', password: 'password123' }
      },
      {
        description: 'should reject missing password',
        data: { email: 'test@example.com', password: '' }
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
      await validateErrorResponse(response, 400, 'Email and password are required');
      validatePrismaCall(prismaMock.user.findUnique, undefined, 0);
    });
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: `http://localhost${ROUTE_ID}`,
      body: validLoginData,
      routeId: ROUTE_ID
    });

    prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

    // Act
    const response = await POST(event);

    // Assert
    await validateErrorResponse(response, 500, 'An error occurred during login');
  });
}); 