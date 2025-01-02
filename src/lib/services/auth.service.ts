import type { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { generateToken } from "$lib/utils/jwt";
import type { LoginCredentials, RegistrationData } from "$lib/types/auth";
import { AuthenticationError, ValidationError } from "$lib/utils/errors";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegistrationData) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError("Email already exists", {
        email: ["Email already exists"],
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        loginAttempts: 0,
        lastLoginAt: null,
        lockedUntil: null,
      },
    });

    // Generate token
    const token = await generateToken(user.id);

    // Create session
    await this.prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      },
    };
  }

  async login(credentials: LoginCredentials) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthenticationError(
        `Account is locked. Please try again after ${user.lockedUntil.toLocaleString()}`,
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!isValidPassword) {
      // Increment login attempts
      const loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts,
          ...(loginAttempts >= 5 && {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          }),
        },
      });

      throw new AuthenticationError("Invalid email or password");
    }

    // Reset login attempts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate token
    const token = await generateToken(user.id);

    // Create session
    await this.prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      },
    };
  }

  async logout(userId: string) {
    // Delete all sessions for user
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: "Logout successful",
    };
  }
}
