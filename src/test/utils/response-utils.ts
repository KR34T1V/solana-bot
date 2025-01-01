import { expect, type MockInstance } from 'vitest';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export async function validateSuccessResponse(response: Response, expectedStatus: number, expectedData?: any) {
  expect(response.status).toBe(expectedStatus);

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.message).toBeDefined();

  if (expectedData) {
    expect(data).toEqual(expectedData);
  }
}

export async function validateErrorResponse(response: Response, expectedStatus: number, expectedMessage: string) {
  expect(response.status).toBe(expectedStatus);

  const data = await response.json();
  expect(data.success).toBe(false);
  expect(data.message).toBe(expectedMessage);
}

export function validatePrismaCall(
  mockFn: MockInstance,
  expectedArgs?: any,
  times = 1
): void {
  if (times === 0) {
    expect(mockFn).not.toHaveBeenCalled();
  } else {
    expect(mockFn).toHaveBeenCalledTimes(times);
    if (expectedArgs) {
      expect(mockFn).toHaveBeenCalledWith(expectedArgs);
    }
  }
} 