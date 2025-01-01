import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { hashPassword, generateToken } from '$lib/server/auth';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password, confirmPassword } = await request.json();

    // Validate input
    if (!email || !password) {
      logger.warn('Registration attempt with missing data', { metadata: { email } });
      return json(
        {
          success: false,
          message: 'Email and password are required'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json(
        {
          success: false,
          message: 'Invalid email format'
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return json(
        {
          success: false,
          message: 'Password must be at least 8 characters long'
        },
        { status: 400 }
      );
    }

    // Validate password confirmation
    if (confirmPassword && password !== confirmPassword) {
      return json(
        {
          success: false,
          message: 'Passwords do not match'
        },
        { status: 400 }
      );
    }

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        logger.warn('Registration attempt with existing email', { metadata: { email } });
        return json(
          {
            success: false,
            message: 'Email already registered'
          },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword
        }
      });

      if (!user || !user.id) {
        throw new Error('Registration failed');
      }

      logger.info('New user registered', { metadata: { email, userId: user.id } });

      // Generate JWT token
      const token = await generateToken(user.id);

      // Create response with token cookie
      const response = json(
        {
          success: true,
          message: 'Registration successful',
          data: { token }
        },
        { status: 201 }
      );

      response.headers.set(
        'Set-Cookie',
        `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      );

      return response;
    } catch (error) {
      logError(error as Error, { metadata: { path: '/api/auth/register', context: 'user creation' } });
      return json(
        {
          success: false,
          message: 'Registration failed'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logError(error as Error, { metadata: { path: '/api/auth/register' } });
    return json(
      {
        success: false,
        message: 'Registration failed'
      },
      { status: 500 }
    );
  }
}; 