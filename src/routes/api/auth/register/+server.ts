import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { hashPassword, generateToken } from '$lib/server/auth';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      logger.warn('Registration attempt with missing data', { email });
      return json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      return json(
        { message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    logger.info('New user registered', { email, userId: user.id });

    // Generate JWT token
    const token = await generateToken(user.id);

    // Create response with token cookie
    const response = json({ token });
    response.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
    );

    return response;
  } catch (error) {
    logError(error as Error, { path: '/api/auth/register' });
    return json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}; 