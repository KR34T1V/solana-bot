import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';
import { prisma } from '$lib/server/prisma';
import { hashPassword } from '$lib/server/auth';
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

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
      },
    });

    logger.info('New user registered', { email, userId: user.id });

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return json({ token });
  } catch (error) {
    logError(error as Error, { path: '/api/auth/register' });
    return json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}; 