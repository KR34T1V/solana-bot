import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "password">;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    };
    token: string;
  };
}

export interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}
