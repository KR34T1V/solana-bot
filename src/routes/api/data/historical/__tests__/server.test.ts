import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '$test/setup';
import { createRequestEvent } from '$test/utils/request-utils';
import { validateSuccessResponse, validateErrorResponse } from '$test/utils/response-utils';
import { POST } from '../+server';
import { mockBirdeyeService } from '$test/mocks/birdeye-service.mock';

describe('Historical Data Endpoint', () => {
  const mockUser = {
    id: 'mock-user-id',
    email: 'test@example.com',
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockApiKey = {
    id: 'mock-api-key-id',
    userId: mockUser.id,
    key: 'test-key',
    name: 'Test Key',
    provider: 'birdeye',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockHistoricalData = [
    {
      value: 98.0,
      updateUnixTime: Date.now() - 3600000,
      updateHour: new Date().getHours() - 1
    },
    {
      value: 99.0,
      updateUnixTime: Date.now() - 7200000,
      updateHour: new Date().getHours() - 2
    }
  ];

  const expectedResponse = {
    success: true,
    message: 'Historical data fetched successfully',
    data: mockHistoricalData
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBirdeyeService.reset();
  });

  it('should throw 401 if user is not authenticated', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: 'http://localhost/api/data/historical',
      body: {
        tokenAddress: 'test-address',
        timeframe: '1h'
      }
    });

    // Act & Assert
    try {
      await POST(event);
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(401);
      expect(err.body?.message).toBe('Unauthorized');
    }
  });

  it('should throw 400 if required parameters are missing', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: 'http://localhost/api/data/historical',
      body: {},
      locals: { user: mockUser }
    });

    // Act & Assert
    try {
      await POST(event);
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.body?.message).toBe('Missing required parameters');
    }
  });

  it('should throw 400 if timeframe is invalid', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: 'http://localhost/api/data/historical',
      body: {
        tokenAddress: 'test-address',
        timeframe: 'invalid'
      },
      locals: { user: mockUser }
    });

    // Act & Assert
    try {
      await POST(event);
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.body?.message).toBe('Invalid timeframe');
    }
  });

  it('should throw 400 if no active API key is found', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: 'http://localhost/api/data/historical',
      body: {
        tokenAddress: 'test-address',
        timeframe: '1h'
      },
      locals: { user: mockUser }
    });

    prismaMock.apiKey.findFirst.mockResolvedValue(null);

    // Act & Assert
    try {
      await POST(event);
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.body?.message).toBe('No active Birdeye API key found');
    }
  });

  it('should return historical price data successfully', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: 'http://localhost/api/data/historical',
      body: {
        tokenAddress: 'test-address',
        timeframe: '1h'
      },
      locals: { user: mockUser }
    });

    prismaMock.apiKey.findFirst.mockResolvedValue(mockApiKey);
    mockBirdeyeService.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    // Act
    const response = await POST(event);

    // Assert
    await validateSuccessResponse(response, 200, expectedResponse);
    expect(mockBirdeyeService.getHistoricalPrices).toHaveBeenCalledWith('test-address', '1h', 'test-key');
  });

  it('should handle BirdeyeService errors', async () => {
    // Arrange
    const event = createRequestEvent({
      method: 'POST',
      url: 'http://localhost/api/data/historical',
      body: {
        tokenAddress: 'test-address',
        timeframe: '1h'
      },
      locals: { user: mockUser }
    });

    prismaMock.apiKey.findFirst.mockResolvedValue(mockApiKey);
    mockBirdeyeService.getHistoricalPrices.mockRejectedValue(new Error('API error'));

    // Act & Assert
    try {
      await POST(event);
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(500);
      expect(err.body?.message).toBe('Failed to fetch historical data');
    }
  });
}); 