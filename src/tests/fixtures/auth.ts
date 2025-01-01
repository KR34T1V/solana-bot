import type { User } from "@prisma/client";
import type { LoginCredentials, RegistrationData } from "$lib/types/auth";

export const validRegistrationData: RegistrationData = {
  email: "test@example.com",
  password: "TestPassword123",
  confirmPassword: "TestPassword123",
};

export const validLoginCredentials: LoginCredentials = {
  email: "test@example.com",
  password: "TestPassword123",
};

export const invalidRegistrationData: Partial<RegistrationData>[] = [
  {
    email: "invalid-email",
    password: "TestPassword123",
    confirmPassword: "TestPassword123",
  },
  {
    email: "test@example.com",
    password: "short",
    confirmPassword: "short",
  },
  {
    email: "test@example.com",
    password: "TestPassword123",
    confirmPassword: "DifferentPassword123",
  },
];

export const mockUser = {
  id: "mock-user-id",
  email: "test@example.com",
  password: "$2a$10$mockhashedpassword",
  lastLoginAt: null,
  loginAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies User;
