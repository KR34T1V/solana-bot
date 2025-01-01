import type { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import type {
  AuthResponse,
  LoginCredentials,
  RegistrationData,
} from "$lib/types/auth";
import { ValidationError, AuthenticationError } from "$lib/utils/errors";
import { generateToken } from "$lib/utils/jwt";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegistrationData): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError("Registration failed", {
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
      },
    });

    // Generate token
    const token = await generateToken(user.id);

    // Create session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      success: true,
      message: "Registration successful",
      data: {
        user: this.sanitizeUser(user),
        token,
      },
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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
        `Account is locked. Try again after ${user.lockedUntil.toLocaleString()}`,
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!isValidPassword) {
      // Increment login attempts
      const loginAttempts = user.loginAttempts + 1;
      const updates = {
        loginAttempts,
        ...(loginAttempts >= 5 && {
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          loginAttempts: 0,
        }),
      };

      await this.prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      throw new AuthenticationError("Invalid email or password");
    }

    // Reset login attempts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    // Generate token
    const token = await generateToken(user.id);

    // Create session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      success: true,
      message: "Login successful",
      data: {
        user: this.sanitizeUser(user),
        token,
      },
    };
  }

  async logout(userId: string): Promise<AuthResponse> {
    // Delete all sessions for user
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: "Logout successful",
    };
  }

  private sanitizeUser(user: User): Omit<User, "password"> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
