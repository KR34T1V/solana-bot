import type { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { generateToken } from "$lib/utils/jwt";
import type { LoginCredentials, RegistrationData } from "$lib/types/auth";
import { AuthenticationError, ValidationError } from "$lib/utils/errors";
import { logger } from "./logging.service";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegistrationData) {
    logger.logAuthAttempt({
      action: "register",
      email: data.email,
    });

    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        logger.logAuthFailure({
          action: "register",
          email: data.email,
          failureReason: "Email already exists",
        });
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

      logger.logAuthSuccess({
        action: "register",
        email: user.email,
        userId: user.id,
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
    } catch (error) {
      // Only log errors that aren't already logged
      if (!(error instanceof ValidationError)) {
        logger.logError(error as Error, {
          action: "register",
          email: data.email,
        });
      }
      throw error;
    }
  }

  async login(credentials: LoginCredentials) {
    logger.logAuthAttempt({
      action: "login",
      email: credentials.email,
    });

    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        logger.logAuthFailure({
          action: "login",
          email: credentials.email,
          failureReason: "User not found",
        });
        throw new AuthenticationError("Invalid email or password");
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        logger.logAuthFailure({
          action: "login",
          email: credentials.email,
          userId: user.id,
          failureReason: "Account locked",
          lockedUntil: user.lockedUntil,
        });
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
        const shouldLock = loginAttempts >= 5;
        const lockedUntil = shouldLock
          ? new Date(Date.now() + 15 * 60 * 1000)
          : null;

        // Lock account after 5 failed attempts
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts,
            ...(shouldLock && { lockedUntil }),
          },
        });

        if (shouldLock) {
          logger.logAccountLock({
            email: user.email,
            userId: user.id,
            loginAttempts,
            lockedUntil,
          });
        } else {
          logger.logAuthFailure({
            action: "login",
            email: user.email,
            userId: user.id,
            failureReason: "Invalid password",
            loginAttempts,
          });
        }

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

      logger.logAuthSuccess({
        action: "login",
        email: user.email,
        userId: user.id,
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
    } catch (error) {
      // Only log errors that aren't already logged
      if (!(error instanceof AuthenticationError)) {
        logger.logError(error as Error, {
          action: "login",
          email: credentials.email,
        });
      }
      throw error;
    }
  }

  async logout(userId: string) {
    logger.logAuthAttempt({
      action: "logout",
      userId,
    });

    try {
      // Delete all sessions for user
      await this.prisma.session.deleteMany({
        where: { userId },
      });

      logger.logAuthSuccess({
        action: "logout",
        userId,
      });

      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      logger.logError(error as Error, {
        action: "logout",
        userId,
      });
      throw error;
    }
  }
}
