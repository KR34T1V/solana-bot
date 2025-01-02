/**
 * @file Managed Authentication Service Implementation
 * @version 1.0.0
 * @description Service manager compatible authentication service with lifecycle management
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { generateToken } from "$lib/utils/jwt";
import type { LoginCredentials, RegistrationData } from "$lib/types/auth";
import { AuthenticationError, ValidationError } from "$lib/utils/errors";
import type { Service } from "./service.manager";
import { ServiceStatus } from "./service.manager";
import type { ManagedLoggingService } from "./managed-logging";

interface AuthConfig {
  maxLoginAttempts: number;
  lockDuration: number; // in minutes
  sessionDuration: number; // in days
  bcryptRounds: number;
  logger: ManagedLoggingService;
}

const DEFAULT_CONFIG: Omit<AuthConfig, "logger"> = {
  maxLoginAttempts: 5,
  lockDuration: 15, // 15 minutes
  sessionDuration: 7, // 7 days
  bcryptRounds: 10,
};

export class ManagedAuthService implements Service {
  private readonly config: AuthConfig;
  private serviceStatus: ServiceStatus;
  private prisma: PrismaClient | null;

  constructor(
    logger: ManagedLoggingService,
    config: Partial<Omit<AuthConfig, "logger">> = {},
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      logger,
    };
    this.serviceStatus = ServiceStatus.PENDING;
    this.prisma = null;
  }

  getName(): string {
    return "auth-service";
  }

  getStatus(): ServiceStatus {
    return this.serviceStatus;
  }

  async start(): Promise<void> {
    if (this.serviceStatus === ServiceStatus.RUNNING) {
      throw new Error("Service is already running");
    }

    try {
      this.serviceStatus = ServiceStatus.STARTING;

      // Initialize Prisma client
      this.prisma = new PrismaClient();
      await this.prisma.$connect();

      this.serviceStatus = ServiceStatus.RUNNING;
      this.config.logger.info("Auth service started", { config: this.config });
    } catch (error) {
      this.serviceStatus = ServiceStatus.ERROR;
      this.config.logger.error("Failed to start auth service:", { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.serviceStatus === ServiceStatus.STOPPED) {
      throw new Error("Service is already stopped");
    }

    try {
      this.serviceStatus = ServiceStatus.STOPPING;
      this.config.logger.info("Auth service stopping");

      if (this.prisma) {
        await this.prisma.$disconnect();
        this.prisma = null;
      }

      this.serviceStatus = ServiceStatus.STOPPED;
    } catch (error) {
      this.serviceStatus = ServiceStatus.ERROR;
      this.config.logger.error("Failed to stop auth service:", { error });
      throw error;
    }
  }

  private ensureRunning(): void {
    if (this.serviceStatus !== ServiceStatus.RUNNING || !this.prisma) {
      throw new Error("Auth service is not running");
    }
  }

  async register(data: RegistrationData) {
    this.ensureRunning();
    if (!this.prisma) return; // TypeScript guard

    this.config.logger.logAuthAttempt({
      action: "register",
      email: data.email,
    });

    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        this.config.logger.logAuthFailure({
          action: "register",
          email: data.email,
          failureReason: "Email already exists",
        });
        throw new ValidationError("Email already exists", {
          email: ["Email already exists"],
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        data.password,
        this.config.bcryptRounds,
      );

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
          expiresAt: new Date(
            Date.now() + this.config.sessionDuration * 24 * 60 * 60 * 1000,
          ),
        },
      });

      this.config.logger.logAuthSuccess({
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
        this.config.logger.logError(error as Error, {
          action: "register",
          email: data.email,
        });
      }
      throw error;
    }
  }

  async login(credentials: LoginCredentials) {
    this.ensureRunning();
    if (!this.prisma) return; // TypeScript guard

    this.config.logger.logAuthAttempt({
      action: "login",
      email: credentials.email,
    });

    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        this.config.logger.logAuthFailure({
          action: "login",
          email: credentials.email,
          failureReason: "User not found",
        });
        throw new AuthenticationError("Invalid email or password");
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        this.config.logger.logAuthFailure({
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
        const shouldLock = loginAttempts >= this.config.maxLoginAttempts;
        const lockedUntil = shouldLock
          ? new Date(Date.now() + this.config.lockDuration * 60 * 1000)
          : null;

        // Lock account after max attempts
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts,
            ...(shouldLock && { lockedUntil }),
          },
        });

        if (shouldLock) {
          this.config.logger.logAccountLock({
            email: credentials.email,
            userId: user.id,
            loginAttempts,
            lockedUntil: lockedUntil!,
          });
        }

        this.config.logger.logAuthFailure({
          action: "login",
          email: credentials.email,
          userId: user.id,
          failureReason: "Invalid password",
          loginAttempts,
          ...(shouldLock && { lockedUntil }),
        });

        throw new AuthenticationError("Invalid email or password");
      }

      // Reset login attempts on successful login
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
          expiresAt: new Date(
            Date.now() + this.config.sessionDuration * 24 * 60 * 60 * 1000,
          ),
        },
      });

      this.config.logger.logAuthSuccess({
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
        this.config.logger.logError(error as Error, {
          action: "login",
          email: credentials.email,
        });
      }
      throw error;
    }
  }

  async logout(userId: string): Promise<void> {
    this.ensureRunning();
    if (!this.prisma) return; // TypeScript guard

    this.config.logger.logAuthAttempt({
      action: "logout",
      userId,
    });

    try {
      await this.prisma.session.deleteMany({
        where: { token: userId },
      });

      this.config.logger.logAuthSuccess({
        action: "logout",
        userId,
      });
    } catch (error) {
      this.config.logger.logAuthFailure({
        action: "logout",
        userId,
        failureReason: (error as Error).message,
      });
      throw error;
    }
  }
}
