import type { User } from "@prisma/client";
import type { LoginCredentials, RegistrationData } from "$lib/types/auth";

export const mockUser = {
  id: "mock-user-id",
  email: "test@example.com",
  password: "hashedPassword",
  loginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

export const validRegistrationData: RegistrationData = {
  email: "new@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
};

export const validLoginCredentials: LoginCredentials = {
  email: "test@example.com",
  password: "Password123!",
};

export const invalidRegistrationData: Partial<RegistrationData>[] = [
  {
    email: "invalid-email",
    password: "Password123!",
    confirmPassword: "Password123!",
  },
  {
    email: "test@example.com",
    password: "short",
    confirmPassword: "short",
  },
  {
    email: "test@example.com",
    password: "Password123!",
    confirmPassword: "DifferentPassword123!",
  },
];
