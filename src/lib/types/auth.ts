import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "password">;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData extends LoginCredentials {
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: SafeUser;
    token: string;
  };
  errors?: Record<string, string[]>;
}

export interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}
